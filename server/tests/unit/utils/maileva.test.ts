import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { postMaileva } from '../../../routes/communications/maileva'
import type { User } from '../../../utils/_schema'
import { create_outbound } from '../../../utils/communications/storage'
import {
  clear_maileva_sessions_for_tests,
  set_maileva_transport_for_tests
} from '../../../utils/maileva/http'
import { encryptMailevaSecrets } from '../../../utils/maileva/secrets'
import {
  clear_maileva_sender_sessions_for_tests,
  dispatchMaileva
} from '../../../utils/maileva/send'
import { totpCode } from '../../../utils/maileva/totp'
import { mailevaResourceStatus } from '../../../utils/maileva/track'
import { setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import {
  emptyProviders,
  mailevaLines,
  providersPath,
  readProviders,
  writeProviders
} from '../../../utils/providers'
import { setup } from '../../../utils/setup'

const paths = testDatastorePaths('maileva')
const user: User = {
  email: 'ada@example.org',
  isAdministrator: false,
  moduleIds: ['tickets'],
  chatbotIds: []
}
const app = new Hono<{ Variables: { user: User } }>()
app.use('*', async (c, next) => {
  c.set('user', user)
  await next()
})
app.post('/courrier', postMaileva('courrier'))
app.post('/lre', postMaileva('lre'))

beforeAll(async () => {
  setDatastoreRoot(paths.root)
  await rm(paths.root, { recursive: true, force: true })
  await setup()
})

beforeEach(() => {
  clear_maileva_sessions_for_tests()
  clear_maileva_sender_sessions_for_tests()
  set_maileva_transport_for_tests(null)
  writeProviders(emptyProviders())
})

afterAll(async () => {
  set_maileva_transport_for_tests(null)
  setDatastoreRoot(null)
  await rm(paths.root, { recursive: true, force: true })
})

describe('Maileva', () => {
  it('calcule le TOTP RFC 6238', async () => {
    await expect(totpCode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59_000)).resolves.toBe('287082')
    await expect(totpCode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 1111111109_000)).resolves.toBe(
      '081804'
    )
  })

  it('chiffre les secrets sans les laisser en clair', async () => {
    const encrypted = await encryptMailevaSecrets({
      clientSecret: 'client-secret',
      password: 'maileva-password',
      totpSecret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
    })
    expect(encrypted.startsWith('v1.')).toBe(true)
    expect(encrypted).not.toContain('maileva-password')
    expect(encrypted).not.toContain('client-secret')
  })

  it('place le code postal en dernière ligne quand il est saisi plus haut', () => {
    expect(mailevaLines('Beckrel\n9 rue des Colonnes\n75002 Paris')).toEqual([
      '',
      'Beckrel',
      '',
      '9 rue des Colonnes',
      '',
      '75002 Paris'
    ])
    expect(mailevaLines('\nBeckrel\n\n9 rue des Colonnes\n\n75002 Paris')).toEqual([
      '',
      'Beckrel',
      '',
      '9 rue des Colonnes',
      '',
      '75002 Paris'
    ])
  })

  it('choisit la sandbox ou la production selon l’utilisateur', async () => {
    const transport = installTransport()
    await configure('sandbox.pierre')
    await send('courrier')
    expect(
      transport.calls.some((url) => url.startsWith('https://api.sandbox.maileva.net/mail/v3/'))
    ).toBe(true)
    transport.calls.length = 0
    await configure('bureau@bailleur.fr')
    await send('courrier')
    expect(transport.calls.some((url) => url.startsWith('https://api.maileva.com/mail/v3/'))).toBe(
      true
    )
    expect(transport.calls.some((url) => url.includes('sandbox'))).toBe(false)
  })

  it('reprend le même brouillon sans le soumettre deux fois', async () => {
    const transport = installTransport()
    await configure('sandbox.pierre')
    const activity = outbound('courrier')
    const input = dispatchInput(activity.id, activity.threadId ?? '')
    await expect(dispatchMaileva(input)).resolves.toBeTruthy()
    await expect(dispatchMaileva(input)).resolves.toBeTruthy()
    expect(transport.submits).toBe(1)
  })

  it('authentifie une seule fois deux LRE concurrentes', async () => {
    const transport = installTransport()
    await configure('sandbox.pierre', true)
    const first = outbound('lre')
    const second = outbound('lre')
    await Promise.all([
      dispatchMaileva(electronicInput(first.id, first.threadId ?? '')),
      dispatchMaileva(electronicInput(second.id, second.threadId ?? ''))
    ])
    expect(transport.authentications).toBe(1)
  })

  it('refuse un courrier sans adresse avant de créer une activité', async () => {
    const response = await app.request('/courrier', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        contexte: 'tickets',
        ref: 'R-1',
        destinataire: { line6: '75001 Paris', country: 'FR' },
        document: {
          name: 'lettre.pdf',
          mediaType: 'application/pdf',
          contentBase64: btoa('%PDF-1.7')
        },
        contenu: { body: 'Bonjour' }
      })
    })
    expect(response.status).toBe(400)
  })

  it('lit les statuts réels et exige le consentement d’un particulier', async () => {
    expect(mailevaResourceStatus('electronic_registered_letter', { status: 'ACCEPTED' })).toBe(
      'delivered'
    )
    expect(mailevaResourceStatus('electronic_registered_delivery', { status: 'ACCEPTED' })).toBe(
      null
    )
    expect(
      mailevaResourceStatus('electronic_registered_delivery', { delivery_status: 'DELIVERED' })
    ).toBe('opened')
    expect(
      mailevaResourceStatus('electronic_registered_delivery', {
        delivery_status: 'UNDELIVERED',
        delivery_status_detail: 'REFUSED'
      })
    ).toBe('refused')
    expect(mailevaResourceStatus('postal_letter', { undelivered_mail_date: '2026-01-01' })).toBe(
      'returned'
    )
    expect(mailevaResourceStatus('postal_letter', { status: 'BLOCKED' })).toBe(null)
    const response = await app.request('/lre', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        contexte: 'tickets',
        ref: 'R-1',
        destinataire: {
          email: 'ada@example.org',
          legalStatus: 'INDIVIDUAL',
          firstName: 'Ada',
          lastName: 'Lovelace'
        },
        document: {
          name: 'lettre.pdf',
          mediaType: 'application/pdf',
          contentBase64: btoa('%PDF-1.7')
        },
        contenu: { body: 'Bonjour' }
      })
    })
    expect(response.status).toBe(400)
  })
})

function installTransport(): { calls: string[]; submits: number; authentications: number } {
  const calls: string[] = []
  const threads = new Map<string, string>()
  const state = { submits: 0, authentications: 0 }
  set_maileva_transport_for_tests(async (input, init) => {
    const url = String(input)
    calls.push(url)
    if (url.endsWith('/token')) return Response.json({ access_token: 'token', expires_in: 3600 })
    if (url.includes('/authenticate_by_otp')) {
      state.authentications += 1
      await new Promise((resolve) => setTimeout(resolve, 20))
      return Response.json({ expiration_date: new Date(Date.now() + 60 * 60 * 1000).toISOString() })
    }
    if (url.endsWith('/submit')) {
      state.submits += 1
      return Response.json({})
    }
    if (url.includes('/documents')) return Response.json({ id: crypto.randomUUID() })
    if (url.includes('/recipients')) return Response.json({ id: crypto.randomUUID() })
    if (init?.method === 'POST' && url.endsWith('/sendings')) {
      const id = crypto.randomUUID()
      const body = JSON.parse(String(init.body)) as { custom_id: string }
      threads.set(id, body.custom_id)
      return Response.json({ id })
    }
    const id = url.split('/').at(-1) ?? ''
    return Response.json({ id, custom_id: threads.get(id) ?? '', status: 'DRAFT' })
  })
  return {
    calls,
    get submits() {
      return state.submits
    },
    get authentications() {
      return state.authentications
    }
  }
}

async function send(product: 'courrier' | 'lre'): Promise<string> {
  const activity = outbound(product)
  return dispatchMaileva(
    product === 'courrier'
      ? dispatchInput(activity.id, activity.threadId ?? '')
      : electronicInput(activity.id, activity.threadId ?? '')
  )
}

async function configure(username: string, electronic = false): Promise<void> {
  writeProviders({
    ...emptyProviders(),
    mailevaClientId: 'client-id',
    mailevaUsername: username,
    mailevaSenderId: electronic ? 'sender-1' : '',
    mailevaAddress: 'Bailleur\n\n\n1 rue de Pierre\n\n75001 Paris',
    mailevaSecrets: await encryptMailevaSecrets({
      clientSecret: 'client-secret',
      password: 'maileva-password',
      totpSecret: electronic ? 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ' : ''
    })
  })
  expect(readFileSync(providersPath(), 'utf8')).not.toContain('maileva-password')
  expect(readProviders().mailevaUsername).toBe(username)
}

function outbound(type: 'courrier' | 'lre') {
  return create_outbound({
    actor: user.email,
    contexte: 'tickets',
    ref: crypto.randomUUID(),
    type,
    destinataire: type === 'lre' ? 'ada@example.org' : '75001 Paris',
    contenu: JSON.stringify({
      version: 2,
      sender: 'user:ada@example.org',
      subject: 'Courrier',
      body: 'Bonjour',
      provider: 'Maileva',
      document: { name: 'lettre.pdf', sha256: 'a'.repeat(64) }
    }),
    idempotency_key: crypto.randomUUID()
  })
}

function dispatchInput(activityId: number, threadId: string) {
  return {
    activityId,
    threadId,
    product: 'courrier' as const,
    name: 'Courrier',
    message: 'Bonjour',
    document: {
      name: 'lettre.pdf',
      mediaType: 'application/pdf',
      bytes: new TextEncoder().encode('%PDF-1.7')
    },
    delivery: {
      kind: 'postal' as const,
      country: 'FR',
      lines: ['', 'Ada', '', '1 rue de Pierre', '', '75001 Paris']
    }
  }
}

function electronicInput(activityId: number, threadId: string) {
  return {
    activityId,
    threadId,
    product: 'lre' as const,
    name: 'LRE',
    message: 'Bonjour',
    document: {
      name: 'lettre.pdf',
      mediaType: 'application/pdf',
      bytes: new TextEncoder().encode('%PDF-1.7')
    },
    delivery: {
      kind: 'electronic' as const,
      email: 'ada@example.org',
      legalStatus: 'PROFESSIONAL' as const,
      firstName: '',
      lastName: '',
      company: 'Bailleur'
    }
  }
}
