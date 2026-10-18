import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller as postEmail } from '../../../../controllers/email/post'
import { controller as postEmailTest } from '../../../../controllers/email/post.test'
import { controller as emailWebhook } from '../../../../controllers/email/post.webhook'
import type { User } from '../../../../utils/_schema'
import { list_activities } from '../../../../utils/activities/query'
import { authorizeAdministrator } from '../../../../utils/authorize-role'
import { claim_outbound_dispatch, create_outbound } from '../../../../utils/communications/storage'
import { CM_EMAIL_URL } from '../../../../utils/email/cm'
import { setDatastoreRoot, testDatastorePaths } from '../../../../utils/paths'
import { emptyProviders, writeProviders } from '../../../../utils/providers'
import { setup } from '../../../../utils/setup'
import { writeSetup } from '../../../../utils/setup-store'

const paths = testDatastorePaths('email_post')
const SECRET = 'email-webhook-secret'
const encoder = new TextEncoder()

const emailProviders = (domain = 'dribble.football') =>
  writeProviders({
    ...emptyProviders(),
    emailDomain: domain,
    emailToken: '00000000-0000-0000-0000-000000000001',
    emailAccount: '00000000-0000-0000-0000-000000000002',
    emailSecret: SECRET
  })

let messageSeq = 0
const sentMessage = () => {
  messageSeq += 1
  return Response.json({
    status: 202,
    message: 'Accepted',
    success: true,
    messageId: `00000000-0000-4000-8000-${String(messageSeq).padStart(12, '0')}`
  })
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

const sign = async (id: string, timestamp: string, body: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  )
  const prefix = encoder.encode(`${id}.${timestamp}.`)
  const bytes = encoder.encode(body)
  const data = new Uint8Array(prefix.length + bytes.length)
  data.set(prefix)
  data.set(bytes, prefix.length)
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data)).toBase64()
}

const postWebhook = async (payload: unknown, id: string) => {
  const body = JSON.stringify(payload)
  const timestamp = String(Date.now())
  return app.request('/webhook/email', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'svix-id': id,
      'svix-timestamp': timestamp,
      'svix-signature': await sign(id, timestamp, body)
    },
    body
  })
}

const event = (
  type: string,
  eventId: string,
  reference: string,
  extra: Record<string, unknown> = {},
  messageId?: string
) => ({
  type,
  createdAt: new Date().toISOString(),
  ...(messageId ? { messageId } : {}),
  data: { id: eventId, customerReference: reference, ...extra }
})

beforeAll(() => {
  setDatastoreRoot(paths.root)
})

beforeEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
  await setup()
  const text = (value: unknown) => new TextEncoder().encode(JSON.stringify(value))
  await writeSetup('global', text({ name: 'PIERRE', timezone: 'Europe/Paris' }))
  await writeSetup('email/html', new TextEncoder().encode('{{ logo_inline_cid }} {{ message }}'))
  await writeSetup('email/logo.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))
  emailProviders()
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
        signedBucketId: 'amiable',
        schedule: {
          defaultMonths: 6,
          maxEffortRate: 35,
          minDailyRemainder: 15,
          thresholds: [{ months: 12, message: 'Confirmer.' }]
        },
        close: {
          execution_complete: { bucketId: 'non_traites' },
          non_respect: { bucketId: 'amiable' },
          remplacement_par_nouveau_plan: { bucketId: 'amiable' },
          effacement_de_dette: { bucketId: 'non_traites' }
        }
      }
    })
  )
})

afterAll(async () => {
  await rm(paths.root, { recursive: true, force: true })
  setDatastoreRoot(null)
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
            signedBucketId: 'amiable',
            schedule: {
              defaultMonths: 6,
              maxEffortRate: 35,
              minDailyRemainder: 15,
              thresholds: [{ months: 12, message: 'Confirmer.' }]
            },
            close: {
              execution_complete: { bucketId: 'non_traites' },
              non_respect: { bucketId: 'amiable' },
              remplacement_par_nouveau_plan: { bucketId: 'amiable' },
              effacement_de_dette: { bucketId: 'non_traites' }
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
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async () =>
      sentMessage()) as unknown as typeof fetch)
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
      const call = fetchSpy.mock.calls.find((entry) => String(entry[0]) === CM_EMAIL_URL)
      const [url, init] = call as [string, RequestInit]
      expect(url).toBe(CM_EMAIL_URL)
      expect((init.headers as Record<string, string>)['x-cm-producttoken']).toBe(
        '00000000-0000-0000-0000-000000000001'
      )
      const payload = JSON.parse(String(init.body)) as {
        from: { email: string; name: string }
        replyTo?: unknown
        html: string
        customerReference: string
        references?: string
        attachments: Array<{ contentId: string; content: string }>
      }
      expect(payload.from).toEqual({ email: 'loyer@dribble.football', name: 'PIERRE' })
      expect(payload.replyTo).toBeUndefined()
      expect(payload.customerReference).toBe(String(sent.data.id))
      expect(payload.references).toBeUndefined()
      expect(payload.html).toContain('cid:logo.png')
      expect(payload.html).toContain('Bonjour<br>Ada')
      expect(payload.attachments[0]?.contentId).toBe('logo.png')
      expect(payload.attachments[0]?.content).toBe(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]).toBase64()
      )

      const messageId = list_activities('alice@example.org', {
        rattachement: 'repayment:LOC-1',
        limit: 10
      }).find((row) => row.id_externe)?.id_externe
      expect(messageId).toMatch(/^[0-9a-f-]{36}$/)
      const db = new Database(paths.database)
      expect(() =>
        db.run('UPDATE activites SET id_externe = ? WHERE id = ?', ['forbidden', sent.data.id])
      ).toThrow('activites is append-only')
      db.close()
      const delivered = event(
        'delivered',
        'evt-delivered',
        String(sent.data.id),
        {},
        messageId ?? undefined
      )
      expect((await postWebhook(delivered, 'svix-delivered')).status).toBe(200)
      expect((await postWebhook(delivered, 'svix-delivered-again')).status).toBe(200)
      const statuses = list_activities('alice@example.org', {
        rattachement: 'repayment:LOC-1',
        limit: 10
      }).filter((row) => row.type === 'communication.ok' && row.thread_id === sent.data.thread_id)
      expect(statuses).toHaveLength(2)
      expect(statuses.every((row) => row.id_externe === messageId)).toBe(true)
      expect(
        (
          await postWebhook(
            event('opened', 'evt-opened', String(sent.data.id), {}, messageId ?? undefined),
            'svix-opened'
          )
        ).status
      ).toBe(200)
      const opened = list_activities('alice@example.org', {
        rattachement: 'repayment:LOC-1',
        limit: 10
      }).find((row) => row.thread_id === sent.data.thread_id && row.contenu.includes('"opened"'))
      expect(opened?.type).toBe('communication.ok')
      expect(
        (
          await app.request('/webhook/email', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{}'
          })
        ).status
      ).toBe(401)
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('retourne une erreur rejouable quand le dispatch est déjà réservé', async () => {
    const idempotencyKey = Bun.randomUUIDv7()
    const activity = create_outbound({
      actor: 'alice@example.org',
      contexte: 'repayment',
      ref: 'LOC-PENDING',
      type: 'email',
      destinataire: 'ada@example.org',
      contenu: JSON.stringify({ subject: 'Loyer', body: 'Bonjour' }),
      idempotency_key: idempotencyKey
    })
    expect(claim_outbound_dispatch(activity.id)).toBe('claimed')
    const fetchSpy = spyOn(globalThis, 'fetch')
    try {
      const response = await app.request('/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({
          contexte: 'repayment',
          ref: 'LOC-PENDING',
          destinataire: 'ada@example.org',
          contenu: { subject: 'Loyer', body: 'Bonjour' }
        })
      })
      expect(response.status).toBe(503)
      expect(response.headers.get('retry-after')).toBe('30')
      expect(await response.json()).toMatchObject({
        error: { code: 'dispatch_pending' },
        data: { id: activity.id }
      })
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('ignore un soft bounce et enregistre l’échec après délivrance', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async () =>
      sentMessage()) as unknown as typeof fetch)
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
      const reference = String(sent.data.id)
      const messageId = list_activities('alice@example.org', {
        rattachement: 'repayment:LOC-2',
        limit: 10
      }).find((row) => row.id_externe)?.id_externe
      expect(
        (
          await postWebhook(
            event(
              'bounced',
              'evt-soft',
              reference,
              { bounce: { type: 'Soft Bounce', message: 'plus tard' } },
              messageId ?? undefined
            ),
            'svix-soft'
          )
        ).status
      ).toBe(200)
      expect(
        (
          await postWebhook(
            event('delivered', 'evt-delivered-2', reference, {}, messageId ?? undefined),
            'svix-delivered-2'
          )
        ).status
      ).toBe(200)
      expect(
        (
          await postWebhook(
            event(
              'bounced',
              'evt-hard',
              reference,
              { bounce: { type: 'Hard Bounce', message: 'boîte pleine' } },
              messageId ?? undefined
            ),
            'svix-hard'
          )
        ).status
      ).toBe(200)
      const rows = list_activities('alice@example.org', {
        rattachement: 'repayment:LOC-2',
        limit: 10
      })
      expect(rows.some((row) => row.contenu.includes('plus tard'))).toBe(false)
      const failed = rows.find((item) => item.type === 'communication.failed')
      expect(JSON.parse(failed?.contenu ?? '{}')).toMatchObject({
        version: 2,
        reason: 'boîte pleine'
      })
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('range la réponse dans le fil de l’activité citée', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async () =>
      sentMessage()) as unknown as typeof fetch)
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
      const messageId = list_activities('alice@example.org', {
        rattachement: 'repayment:LOC-3',
        limit: 10
      }).find((row) => row.id_externe)?.id_externe
      expect(messageId).toBeDefined()
      const cited = `<20261015184000.${messageId}@dribble.football>`
      const inbound = {
        type: 'Inbound',
        from: 'ada@example.org',
        originalRecipient: 'loyer@dribble.football',
        subject: 'Re: Loyer',
        messageId: '<reply-1@example.org>',
        textBody: 'Bien reçu',
        inReplyTo: cited,
        references: []
      }
      expect((await postWebhook(inbound, 'svix-reply-1')).status).toBe(200)
      expect((await postWebhook(inbound, 'svix-reply-1')).status).toBe(200)
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
      expect(received[0]?.id_externe).toBe('reply-1@example.org')
      expect(
        (
          await postWebhook(
            {
              ...inbound,
              textBody: 'Via references',
              messageId: '<reply-2@example.org>',
              inReplyTo: '<reply-1@example.org>',
              references: []
            },
            'svix-reply-2'
          )
        ).status
      ).toBe(200)
      expect(
        (
          await postWebhook(
            {
              ...inbound,
              textBody: 'Via en-tête',
              inReplyTo: '',
              references: [],
              headers: [{ Name: 'References', Value: cited }]
            },
            'svix-reply-3'
          )
        ).status
      ).toBe(200)
      const both = list_activities('alice@example.org', {
        rattachement: 'repayment:LOC-3',
        limit: 10
      }).filter((row) => row.type === 'communication.received')
      expect(both).toHaveLength(3)
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('laisse à qualifier une réponse qui ne cite pas l’activité', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async () =>
      sentMessage()) as unknown as typeof fetch)
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
      expect(
        (
          await postWebhook(
            {
              type: 'Inbound',
              from: 'ada@example.org',
              originalRecipient: 'loyer@dribble.football',
              subject: 'Autre sujet',
              textBody: 'Sans citation'
            },
            'svix-unlinked'
          )
        ).status
      ).toBe(200)
      const onThread = list_activities('alice@example.org', {
        rattachement: 'repayment:LOC-4',
        limit: 10
      }).filter((row) => row.type === 'communication.received')
      expect(onThread).toHaveLength(0)
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
      expect(fetchSpy.mock.calls.some((call) => String(call[0]).includes('api.cm.com'))).toBe(false)
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('envoie l’email de test à l’administrateur sans créer d’activité', async () => {
    expect((await member.request('/email/test', { method: 'POST' })).status).toBe(403)
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async () =>
      sentMessage()) as unknown as typeof fetch)
    try {
      const response = await administrator.request('/email/test', { method: 'POST' })
      expect(response.status).toBe(200)
      const call = fetchSpy.mock.calls.find((entry) => String(entry[0]) === CM_EMAIL_URL)
      const payload = JSON.parse(String((call as [string, RequestInit])[1].body)) as {
        to: Array<{ email: string }>
        from: { email: string; name: string }
        subject: string
        text: string
        customerReference?: string
        html: string
      }
      expect(payload.to).toEqual([{ email: 'alice@example.org' }])
      expect(payload.from).toEqual({ email: 'loyer@dribble.football', name: 'PIERRE' })
      expect(payload.subject).toBe('Email de test')
      expect(payload.text).toBe('Ceci est un email de test.')
      expect(payload.customerReference).toBeUndefined()
      expect(payload.html).toContain('cid:logo.png')
      expect(payload.html).toContain('Ceci est un email de test.')
      expect(list_activities('alice@example.org', { limit: 10 })).toHaveLength(0)
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('ignore un entrant hors domaine', async () => {
    expect(
      (
        await postWebhook(
          {
            type: 'Inbound',
            from: 'ada@example.org',
            originalRecipient: 'ada@example.org',
            textBody: 'Ailleurs'
          },
          'svix-foreign'
        )
      ).status
    ).toBe(200)
    expect(
      list_activities('alice@example.org', {
        contexts: ['a_qualifier'],
        type: 'communication.received',
        limit: 10
      })
    ).toHaveLength(0)
  })

  it('demande un rejeu si le domaine entrant manque', async () => {
    emailProviders('')
    const response = await postWebhook(
      {
        type: 'Inbound',
        from: 'ada@example.org',
        originalRecipient: 'loyer@dribble.football',
        textBody: 'À rejouer'
      },
      'svix-no-domain'
    )
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ error: { code: 'not_configured' } })
  })

  it('rejoue un succès CM ambigu sans terminaliser la communication', async () => {
    let attempts = 0
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async (url: unknown) => {
      if (String(url) !== CM_EMAIL_URL) return new Response(null, { status: 204 })
      attempts += 1
      return attempts === 1 ? new Response('Accepted', { status: 202 }) : sentMessage()
    }) as typeof fetch)
    try {
      const idempotencyKey = Bun.randomUUIDv7()
      const request = () =>
        app.request('/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
          body: JSON.stringify({
            contexte: 'repayment',
            ref: 'LOC-NO-ID',
            destinataire: 'ada@example.org',
            contenu: { subject: 'Loyer', body: 'Bonjour' }
          })
        })
      const response = await request()
      expect(response.status).toBe(503)
      expect(response.headers.get('retry-after')).toBe('30')
      expect(await response.json()).toMatchObject({
        error: { code: 'cm_invalid_response', message: 'Réponse CM.com invalide' },
        data: { type: 'communication.sent' }
      })
      let rows = list_activities('alice@example.org', {
        rattachement: 'repayment:LOC-NO-ID',
        limit: 10
      })
      expect(rows.some((row) => row.type === 'communication.failed')).toBe(false)
      expect(rows.some((row) => row.type === 'communication.ok')).toBe(false)

      expect((await request()).status).toBe(201)
      rows = list_activities('alice@example.org', {
        rattachement: 'repayment:LOC-NO-ID',
        limit: 10
      })
      expect(rows.some((row) => row.type === 'communication.ok' && row.id_externe)).toBe(true)
      expect(attempts).toBe(2)
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('terminalise uniquement un rejet CM explicite', async () => {
    let attempts = 0
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async (url: unknown) => {
      if (String(url) !== CM_EMAIL_URL) return new Response(null, { status: 204 })
      attempts += 1
      return new Response('Recipient rejected', { status: 422 })
    }) as typeof fetch)
    try {
      const idempotencyKey = Bun.randomUUIDv7()
      const response = await app.request('/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({
          contexte: 'repayment',
          ref: 'LOC-REJECTED',
          destinataire: 'ada@example.org',
          contenu: { subject: 'Loyer', body: 'Bonjour' }
        })
      })
      expect(response.status).toBe(502)
      expect(await response.json()).toMatchObject({
        error: { code: 'cm_rejected', message: 'Recipient rejected' },
        data: { type: 'communication.failed' }
      })
      const rows = list_activities('alice@example.org', {
        rattachement: 'repayment:LOC-REJECTED',
        limit: 10
      })
      expect(rows.some((row) => row.type === 'communication.failed')).toBe(true)
      expect(rows.some((row) => row.type === 'communication.ok')).toBe(false)
      expect(attempts).toBe(1)
    } finally {
      fetchSpy.mockRestore()
    }
  })
})
