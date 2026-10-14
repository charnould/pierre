import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller as postEmail } from '../../../../controllers/email/post'
import { controller as emailInbound } from '../../../../controllers/email/post.inbound'
import { controller as postEmailTest } from '../../../../controllers/email/post.test'
import { controller as emailWebhook } from '../../../../controllers/email/post.webhook'
import type { User } from '../../../../utils/_schema'
import { list_activities } from '../../../../utils/activities/query'
import { authorizeAdministrator } from '../../../../utils/authorize-role'
import { setDatastoreRoot, testDatastorePaths } from '../../../../utils/paths'
import { setup } from '../../../../utils/setup'
import { writeSetup } from '../../../../utils/setup-store'

const paths = testDatastorePaths('email_post')
const SECRET = 'email-webhook-secret'
const encoder = new TextEncoder()
const originalEnv = {
  api: Bun.env['SINCH_API_KEY'],
  domain: Bun.env['SINCH_DOMAIN'],
  signing: Bun.env['SINCH_WEBHOOK_SIGNING_KEY']
}

const restoreEnv = (key: string, value: string | undefined): void => {
  if (value === undefined) delete Bun.env[key]
  else Bun.env[key] = value
}

const app = new Hono<{ Variables: { user: User } }>()
app.use('*', async (c, next) => {
  c.set('user', {
    email: 'alice@example.org',
    isAdministrator: false,
    moduleIds: ['repayment'],
    chatbotIds: []
  })
  await next()
})
app.post('/email', postEmail)
app.post('/webhook/email', emailWebhook)
app.post('/webhook/email/inbound', emailInbound)

const administrator = new Hono<{ Variables: { user: User } }>()
administrator.use('*', async (c, next) => {
  c.set('user', {
    email: 'alice@example.org',
    isAdministrator: true,
    moduleIds: ['repayment'],
    chatbotIds: []
  })
  await next()
})
administrator.post('/email/test', authorizeAdministrator, postEmailTest)

const member = new Hono<{ Variables: { user: User } }>()
member.use('*', async (c, next) => {
  c.set('user', {
    email: 'alice@example.org',
    isAdministrator: false,
    moduleIds: ['repayment'],
    chatbotIds: []
  })
  await next()
})
member.post('/email/test', authorizeAdministrator, postEmailTest)

async function sign(timestamp: string, token: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const digest = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}${token}`))
  )
  return digest.toHex()
}

async function signedEvent(
  event: string,
  id: string,
  reference: string,
  extra: Record<string, unknown> = {}
): Promise<string> {
  const timestamp = String(Math.floor(Date.now() / 1000))
  const token = `token-${id}`
  return JSON.stringify({
    signature: { timestamp, token, signature: await sign(timestamp, token) },
    'event-data': {
      event,
      timestamp: Number(timestamp),
      id,
      message: { headers: { 'message-id': `<${reference}>` } },
      ...extra
    }
  })
}

async function signedInbound(fields: Record<string, string>): Promise<URLSearchParams> {
  const timestamp = String(Math.floor(Date.now() / 1000))
  const token = `token-${fields['Message-Id'] ?? 'inbound'}`
  const params = new URLSearchParams({ ...fields, timestamp, token })
  params.set('signature', await sign(timestamp, token))
  return params
}

beforeAll(() => {
  setDatastoreRoot(paths.root)
})

beforeEach(async () => {
  Bun.env['SINCH_API_KEY'] = 'key-test'
  Bun.env['SINCH_DOMAIN'] = 'dribble.football'
  Bun.env['SINCH_WEBHOOK_SIGNING_KEY'] = SECRET
  await rm(paths.root, { recursive: true, force: true })
  await setup()
  const text = (value: unknown) => new TextEncoder().encode(JSON.stringify(value))
  await writeSetup('global', text({ name: 'PIERRE', timezone: 'Europe/Paris' }))
  await writeSetup('email/html', new TextEncoder().encode('{{ logo_inline_cid }} {{ message }}'))
  await writeSetup('email/logo.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))
  await writeSetup(
    'repayment',
    text({
      buckets: [
        { id: 'non_traites', label: 'Non traités' },
        { id: 'amiable', label: 'Amiable' },
        { id: 'clients_partis', label: 'Partis' }
      ],
      actions: { dossier: ['Analyser'], bulk_operations: ['Relancer'] },
      tags: ['décès'],
      template_groups: ['RCS'],
      templates: ['note.md'],
      email_from: 'loyer@dribble.football',
      create_plan: {
        signed_bucket_id: 'amiable',
        close: {
          execution_complete: { bucket_id: 'non_traites' },
          non_respect: { bucket_id: 'amiable' },
          remplacement_par_nouveau_plan: { bucket_id: 'amiable' },
          effacement_de_dette: { bucket_id: 'non_traites' }
        }
      }
    })
  )
})

afterAll(async () => {
  await rm(paths.root, { recursive: true, force: true })
  setDatastoreRoot(null)
  restoreEnv('SINCH_API_KEY', originalEnv.api)
  restoreEnv('SINCH_DOMAIN', originalEnv.domain)
  restoreEnv('SINCH_WEBHOOK_SIGNING_KEY', originalEnv.signing)
})

describe('email transactionnel', () => {
  it('refuse l’envoi sans email_from', async () => {
    await writeSetup(
      'repayment',
      new TextEncoder().encode(
        JSON.stringify({
          buckets: [
            { id: 'non_traites', label: 'Non traités' },
            { id: 'amiable', label: 'Amiable' },
            { id: 'clients_partis', label: 'Partis' }
          ],
          actions: { dossier: ['Analyser'], bulk_operations: ['Relancer'] },
          tags: ['décès'],
          template_groups: ['RCS'],
          templates: ['note.md'],
          create_plan: {
            signed_bucket_id: 'amiable',
            close: {
              execution_complete: { bucket_id: 'non_traites' },
              non_respect: { bucket_id: 'amiable' },
              remplacement_par_nouveau_plan: { bucket_id: 'amiable' },
              effacement_de_dette: { bucket_id: 'non_traites' }
            }
          }
        })
      )
    )
    const response = await app.request('/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': Bun.randomUUIDv7() },
      body: JSON.stringify({
        contexte: 'repayment',
        ref: 'LOC-1',
        destinataire: 'ada@example.org',
        contenu: { subject: 'Loyer', body: 'Bonjour' }
      })
    })
    expect(response.status).toBe(503)
  })

  it('envoie le gabarit et rattache l’accusé au même fil', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 202 })
    )
    try {
      const response = await app.request('/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': Bun.randomUUIDv7() },
        body: JSON.stringify({
          contexte: 'repayment',
          ref: 'LOC-1',
          destinataire: 'ada@example.org',
          contenu: { subject: 'Loyer', body: 'Bonjour\nAda' }
        })
      })
      expect(response.status).toBe(201)
      const sent = (await response.json()) as { data: { id: number; thread_id: string } }
      const call = fetchSpy.mock.calls.find((entry) =>
        String(entry[0]).includes('api.eu.mailgun.net')
      )
      const [url, init] = call as [string, RequestInit]
      expect(url).toBe('https://api.eu.mailgun.net/v3/dribble.football/messages')
      expect((init.headers as Record<string, string>)['authorization']).toStartWith('Basic ')
      const form = init.body as FormData
      expect(form.get('from')).toBe('PIERRE <loyer@dribble.football>')
      expect(form.get('h:Reply-To')).toBeNull()
      expect(form.get('h:Message-Id')).toBe(String(sent.data.id))
      expect(form.get('o:tracking-opens')).toBe('yes')
      expect(String(form.get('html'))).toContain('cid:logo.png')
      expect(String(form.get('html'))).toContain('Bonjour<br>Ada')
      expect(form.get('inline')).toBeInstanceOf(File)
      expect((form.get('inline') as File).name).toBe('logo.png')

      const event = await signedEvent('delivered', 'evt-delivered', String(sent.data.id))
      expect(
        (
          await app.request('/webhook/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: event
          })
        ).status
      ).toBe(200)
      expect(
        (
          await app.request('/webhook/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: event
          })
        ).status
      ).toBe(200)
      const rows = list_activities('alice@example.org', {
        rattachement: 'repayment:LOC-1',
        limit: 10
      })
      const statuses = rows.filter(
        (row) => row.type === 'communication.ok' && row.thread_id === sent.data.thread_id
      )
      expect(statuses).toHaveLength(1)
      const opened = await signedEvent('opened', 'evt-opened', String(sent.data.id))
      expect(
        (
          await app.request('/webhook/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: opened
          })
        ).status
      ).toBe(200)
      const read = list_activities('alice@example.org', {
        rattachement: 'repayment:LOC-1',
        limit: 10
      }).find((row) => row.thread_id === sent.data.thread_id && row.contenu.includes('"read"'))
      expect(read?.type).toBe('communication.ok')
      const timestamp = String(Math.floor(Date.now() / 1000))
      expect(
        (
          await app.request('/webhook/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              signature: { timestamp, token: 'non', signature: 'ab'.repeat(32) },
              'event-data': { event: 'delivered', id: 'evt-bad' }
            })
          })
        ).status
      ).toBe(401)
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('marque l’échec définitif', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 })
    )
    try {
      const response = await app.request('/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': Bun.randomUUIDv7() },
        body: JSON.stringify({
          contexte: 'repayment',
          ref: 'LOC-2',
          destinataire: 'ada@example.org',
          contenu: { subject: 'Loyer', body: 'Bonjour' }
        })
      })
      const sent = (await response.json()) as { data: { id: number; thread_id: string } }
      const failed = await signedEvent('permanent_fail', 'evt-fail', String(sent.data.id), {
        'delivery-status': { message: 'boîte pleine' }
      })
      expect(
        (
          await app.request('/webhook/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: failed
          })
        ).status
      ).toBe(200)
      const row = list_activities('alice@example.org', {
        rattachement: 'repayment:LOC-2',
        limit: 10
      }).find((item) => item.type === 'communication.failed')
      expect(JSON.parse(row?.contenu ?? '{}')).toMatchObject({ version: 2, reason: 'boîte pleine' })
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('range la réponse dans le fil de l’activité citée', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 })
    )
    try {
      const response = await app.request('/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': Bun.randomUUIDv7() },
        body: JSON.stringify({
          contexte: 'repayment',
          ref: 'LOC-3',
          destinataire: 'ada@example.org',
          contenu: { subject: 'Loyer', body: 'Bonjour' }
        })
      })
      const sent = (await response.json()) as { data: { id: number; thread_id: string } }
      const inbound = await signedInbound({
        sender: 'ada@example.org',
        recipient: 'loyer@dribble.football',
        subject: 'Re: Loyer',
        'stripped-text': 'Bien reçu',
        'Message-Id': '<reply-1@example.org>',
        'message-headers': JSON.stringify([['In-Reply-To', String(sent.data.id)]])
      })
      expect(
        (
          await app.request('/webhook/email/inbound', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: inbound
          })
        ).status
      ).toBe(200)
      expect(
        (
          await app.request('/webhook/email/inbound', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: inbound
          })
        ).status
      ).toBe(200)
      const received = list_activities('alice@example.org', {
        rattachement: 'repayment:LOC-3',
        limit: 10
      }).filter((row) => row.type === 'communication.received')
      expect(received).toHaveLength(1)
      expect(received[0]?.thread_id).toBe(sent.data.thread_id)
      expect(JSON.parse(received[0]?.contenu ?? '{}')).toMatchObject({
        subject: 'Re: Loyer',
        body: 'Bien reçu',
        sender: 'ada@example.org'
      })
      const viaReferences = await signedInbound({
        sender: 'ada@example.org',
        recipient: 'loyer@dribble.football',
        subject: 'Re: Loyer',
        'stripped-text': 'Via References',
        'Message-Id': '<reply-2@example.org>',
        'message-headers': JSON.stringify([['References', `999999 ${sent.data.id}`]])
      })
      expect(
        (
          await app.request('/webhook/email/inbound', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: viaReferences
          })
        ).status
      ).toBe(200)
      const both = list_activities('alice@example.org', {
        rattachement: 'repayment:LOC-3',
        limit: 10
      }).filter((row) => row.type === 'communication.received')
      expect(both).toHaveLength(2)
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('laisse à qualifier une réponse qui ne cite pas l’activité', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 })
    )
    try {
      const response = await app.request('/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': Bun.randomUUIDv7() },
        body: JSON.stringify({
          contexte: 'repayment',
          ref: 'LOC-4',
          destinataire: 'ada@example.org',
          contenu: { subject: 'Loyer', body: 'Bonjour' }
        })
      })
      expect(response.status).toBe(201)
      const sent = (await response.json()) as { data: { thread_id: string } }
      const inbound = await signedInbound({
        sender: 'ada@example.org',
        recipient: 'loyer@dribble.football',
        subject: 'Autre sujet',
        'stripped-text': 'Sans citation',
        'Message-Id': '<unlinked@example.org>'
      })
      expect(
        (
          await app.request('/webhook/email/inbound', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: inbound
          })
        ).status
      ).toBe(200)
      const onThread = list_activities('alice@example.org', {
        rattachement: 'repayment:LOC-4',
        limit: 10
      }).filter((row) => row.type === 'communication.received')
      expect(onThread).toHaveLength(0)
      expect(sent.data.thread_id).toBeTruthy()
      const received = list_activities('alice@example.org', {
        contexts: ['a_qualifier'],
        type: 'communication.received',
        limit: 10
      })
      expect(received).toHaveLength(1)
      expect(JSON.parse(received[0]?.contenu ?? '{}').body).toBe('Sans citation')
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('refuse l’envoi sans gabarit complet', async () => {
    const db = new Database(paths.database)
    db.run("DELETE FROM setup WHERE id = 'email/html'")
    db.close()
    const fetchSpy = spyOn(globalThis, 'fetch')
    try {
      const response = await app.request('/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': Bun.randomUUIDv7() },
        body: JSON.stringify({
          contexte: 'repayment',
          ref: 'LOC-5',
          destinataire: 'ada@example.org',
          contenu: { subject: 'Loyer', body: 'Bonjour' }
        })
      })
      expect(response.status).toBe(503)
      expect(await response.json()).toMatchObject({
        error: { code: 'not_configured', message: 'Gabarit email incomplet' }
      })
      expect(
        fetchSpy.mock.calls.some((call) => String(call[0]).includes('api.eu.mailgun.net'))
      ).toBe(false)
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('envoie l’email de test à l’administrateur sans créer d’activité', async () => {
    expect(
      (
        await member.request('/email/test', {
          method: 'POST'
        })
      ).status
    ).toBe(403)
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 })
    )
    try {
      const response = await administrator.request('/email/test', { method: 'POST' })
      expect(response.status).toBe(200)
      const call = fetchSpy.mock.calls.find((entry) =>
        String(entry[0]).includes('api.eu.mailgun.net')
      )
      const [, init] = call as [string, RequestInit]
      const form = init.body as FormData
      expect(form.get('to')).toBe('alice@example.org')
      expect(form.get('from')).toBe('PIERRE <loyer@dribble.football>')
      expect(form.get('subject')).toBe('Email de test')
      expect(form.get('text')).toBe('Ceci est un email de test.')
      expect(form.get('h:Message-Id')).toBeNull()
      expect(String(form.get('html'))).toContain('cid:logo.png')
      expect(String(form.get('html'))).toContain('Ceci est un email de test.')
      expect(form.get('inline')).toBeInstanceOf(File)
      expect(list_activities('alice@example.org', { limit: 10 })).toHaveLength(0)
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('laisse à qualifier une réponse sans fil', async () => {
    const inbound = await signedInbound({
      sender: 'inconnu@example.org',
      recipient: 'loyer@dribble.football',
      subject: 'Question',
      'body-plain': 'Qui est-ce ?',
      'Message-Id': '<unknown@example.org>'
    })
    expect(
      (
        await app.request('/webhook/email/inbound', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: inbound
        })
      ).status
    ).toBe(200)
    const received = list_activities('alice@example.org', {
      contexts: ['a_qualifier'],
      type: 'communication.received',
      limit: 10
    })
    expect(received).toHaveLength(1)
    expect(JSON.parse(received[0]?.contenu ?? '{}').body).toBe('Qui est-ce ?')
  })
})
