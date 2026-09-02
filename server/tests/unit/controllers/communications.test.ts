import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller as courrierWebhook } from '../../../controllers/courrier/post.webhook'
import { controller as emailSend } from '../../../controllers/email/post'
import { controller as emailWebhook } from '../../../controllers/email/post.webhook'
import { controller as mailtoSend } from '../../../controllers/mailto/post'
import { controller as rcsWebhook } from '../../../controllers/rcs/post.webhook'
import { list_activities } from '../../../utils/activities/query'
import { get_activity } from '../../../utils/activities/rows'
import { create_outbound } from '../../../utils/communications/storage'
import { datastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'

const SERVICE = '_test_communication_controllers'
const ROOT = datastorePaths(SERVICE).root
const SECRET = 'secret-test-key'
const originalService = Bun.env['SERVICE']
const originalSecret = Bun.env['CM_WEBHOOK_SECRET']
const originalFakeSecret = Bun.env['FAKE_WEBHOOK_KEY']
const originalNodeEnv = Bun.env['NODE_ENV']

beforeAll(async () => {
  Bun.env['SERVICE'] = SERVICE
  Bun.env['CM_WEBHOOK_SECRET'] = SECRET
  Bun.env['FAKE_WEBHOOK_KEY'] = SECRET
  await rm(ROOT, { recursive: true, force: true })
  await setup()
})

afterAll(async () => {
  await rm(ROOT, { recursive: true, force: true })
  if (originalService === undefined) delete Bun.env['SERVICE']
  else Bun.env['SERVICE'] = originalService
  if (originalSecret === undefined) delete Bun.env['CM_WEBHOOK_SECRET']
  else Bun.env['CM_WEBHOOK_SECRET'] = originalSecret
  if (originalFakeSecret === undefined) delete Bun.env['FAKE_WEBHOOK_KEY']
  else Bun.env['FAKE_WEBHOOK_KEY'] = originalFakeSecret
  if (originalNodeEnv === undefined) delete Bun.env['NODE_ENV']
  else Bun.env['NODE_ENV'] = originalNodeEnv
})

describe('webhooks de communication', () => {
  it('simule un envoi et ne le rejoue pas avec la même clé', async () => {
    const app = new Hono<{ Variables: { user: { email: string } } }>()
    app.use('*', async (c, next) => {
      c.set('user', { email: 'alice@example.org' })
      await next()
    })
    app.post('/email', emailSend)
    const key = crypto.randomUUID()
    const request = () =>
      app.request('/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify({
          contexte: 'automations',
          ref: 'EMAIL-SEND-1',
          destinataire: 'tenant@example.org',
          contenu: { objet: 'Relance', corps: 'Bonjour' }
        })
      })

    const first = await request()
    const replay = await request()
    expect(first.status).toBe(201)
    expect(replay.status).toBe(201)
    const firstBody = (await first.json()) as { data: { id: number; statut: string } }
    const replayBody = (await replay.json()) as { data: { id: number; statut: string } }
    expect(firstBody.data.statut).toBe('sent')
    expect(replayBody.data.id).toBe(firstBody.data.id)
  })

  it('protège et valide les webhooks simulés', async () => {
    const activity = create_outbound({
      actor: 'alice@example.org',
      contexte: 'automations',
      ref: 'EMAIL-1',
      type: 'email',
      destinataire: 'tenant@example.org',
      contenu: JSON.stringify({ version: 1, corps: 'Bonjour' }),
      idempotency_key: crypto.randomUUID()
    })
    const app = new Hono().post('/webhook/email', emailWebhook)
    const body = {
      activityId: activity.id,
      status: 'delivered',
      occurredAt: '2030-08-26T20:00:00Z'
    }

    expect(
      (await app.request('/webhook/email', { method: 'POST', body: JSON.stringify(body) })).status
    ).toBe(401)
    const response = await app.request('/webhook/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Webhook-Secret': SECRET },
      body: JSON.stringify(body)
    })
    expect(response.status).toBe(200)
    expect(get_activity(activity.id)?.statut).toBe('delivered')
    const invalid = await app.request('/webhook/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Webhook-Secret': SECRET },
      body: JSON.stringify({ ...body, status: 'signed', occurredAt: '2030-08-26T20:01:00Z' })
    })
    expect(invalid.status).toBe(400)
    expect(get_activity(activity.id)?.statut).toBe('delivered')
  })

  it('uses Webhook-Secret consistently for simulated providers', async () => {
    const app = new Hono().post('/webhook/courrier', courrierWebhook)
    const payload = JSON.stringify({})
    expect(
      (
        await app.request('/webhook/courrier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Webhook-Key': SECRET },
          body: payload
        })
      ).status
    ).toBe(401)
    expect(
      (
        await app.request('/webhook/courrier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Webhook-Secret': SECRET },
          body: payload
        })
      ).status
    ).toBe(400)
  })

  it('rejects unknown RCS statuses as validation errors', async () => {
    const app = new Hono().post('/webhook/rcs', rcsWebhook)
    const response = await app.request('/webhook/rcs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Webhook-Secret': SECRET },
      body: JSON.stringify({
        reference: 'p1',
        status: { code: 999 },
        received: '2030-08-26T20:00:00Z'
      })
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: { code: 'invalid_webhook', message: 'Statut webhook inconnu' }
    })
  })

  it('mappe les statuts CM et rattache une réponse au thread référencé', async () => {
    const activity = create_outbound({
      actor: 'alice@example.org',
      contexte: 'automations',
      ref: 'RCS-1',
      type: 'rcs',
      destinataire: '+33612345678',
      contenu: JSON.stringify({
        version: 1,
        corps: 'Choisissez',
        choix: [{ id: 'rappeler', label: 'Être rappelé' }]
      }),
      idempotency_key: crypto.randomUUID()
    })
    const app = new Hono().post('/webhook/rcs', rcsWebhook)
    const headers = { 'Content-Type': 'application/json', 'Webhook-Secret': SECRET }

    expect(
      (
        await app.request('/webhook/rcs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: `p${activity.id}`, status: { code: 2 } })
        })
      ).status
    ).toBe(401)
    expect(
      (
        await app.request('/webhook/rcs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Webhook-Secret': 'wrong' },
          body: JSON.stringify({ reference: `p${activity.id}`, status: { code: 2 } })
        })
      ).status
    ).toBe(401)

    const status = await app.request('/webhook/rcs', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        reference: `p${activity.id}`,
        status: { code: 2 },
        received: '2030-08-26T20:00:00Z'
      })
    })
    expect(status.status).toBe(200)
    expect(get_activity(activity.id)?.statut).toBe('delivered')

    const inboundPayload = {
      reference: crypto.randomUUID(),
      messageContext: `p${activity.id}`,
      from: { number: '+33612345678' },
      timeUtc: '2030-08-26T20:01:00Z',
      event: { custom: { postbackdata: 'rappeler' } }
    }
    const inbound = await app.request('/webhook/rcs', {
      method: 'POST',
      headers,
      body: JSON.stringify(inboundPayload)
    })
    expect(inbound.status).toBe(200)
    expect(
      (
        await app.request('/webhook/rcs', {
          method: 'POST',
          headers,
          body: JSON.stringify(inboundPayload)
        })
      ).status
    ).toBe(200)
    expect(
      (
        await app.request('/webhook/rcs', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ...inboundPayload,
            reference: crypto.randomUUID(),
            timeUtc: '2030-08-26T20:02:00Z',
            event: { custom: { postbackdata: 'confirmer' } }
          })
        })
      ).status
    ).toBe(200)
    const rows = list_activities('alice@example.org', {
      rattachement: 'automations:RCS-1',
      limit: 10,
      offset: 0
    })
    const received = rows.filter((row) => row.statut === 'received')
    expect(received.every((row) => row.thread_id === activity.thread_id)).toBe(true)
    expect(received.some((row) => row.contenu.includes('Être rappelé'))).toBe(true)
    expect(received).toHaveLength(2)
  })
})

describe('POST /mailto et action', () => {
  const app = new Hono<{ Variables: { user: { email: string } } }>()
  app.use('*', async (c, next) => {
    c.set('user', { email: 'alice@example.org' })
    await next()
  })
  app.post('/mailto', mailtoSend)
  app.post('/email', emailSend)

  it('journalise un courriel déjà envoyé (type email, sent) avec action', async () => {
    const response = await app.request('/mailto', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify({
        contexte: 'automations',
        ref: 'MAILTO-1',
        destinataire: 'caf@example.fr',
        contenu: {
          action: 'Contacter la CAF',
          objet: 'Dossier APL',
          corps: 'Merci de rétablir l’APL.'
        }
      })
    })
    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      data: { type: string; statut: string; contenu: string }
    }
    expect(body.data.type).toBe('email')
    expect(body.data.statut).toBe('sent')
    expect(JSON.parse(body.data.contenu)).toMatchObject({
      version: 1,
      action: 'Contacter la CAF',
      objet: 'Dossier APL',
      corps: 'Merci de rétablir l’APL.',
      delivery: {
        history: [
          expect.objectContaining({ status: 'queued' }),
          expect.objectContaining({ status: 'sent' })
        ]
      }
    })
  })

  it('does not claim a simulated provider sent messages in production', async () => {
    const previous = Bun.env['NODE_ENV']
    Bun.env['NODE_ENV'] = 'production'
    try {
      const response = await app.request('/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify({
          contexte: 'automations',
          ref: 'EMAIL-PRODUCTION-1',
          destinataire: 'fail@example.org',
          contenu: { objet: 'Relance', corps: 'Bonjour' }
        })
      })
      expect(response.status).toBe(501)
      expect(await response.json()).toMatchObject({
        error: { code: 'provider_not_configured' }
      })
    } finally {
      if (previous === undefined) delete Bun.env['NODE_ENV']
      else Bun.env['NODE_ENV'] = previous
    }
  })

  it('accepte un mailto avec objet seul', async () => {
    const response = await app.request('/mailto', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify({
        contexte: 'automations',
        ref: 'MAILTO-2',
        destinataire: 'caf@example.fr',
        contenu: { objet: 'Dossier APL', corps: '' }
      })
    })
    expect(response.status).toBe(201)
  })

  it('persiste action sur POST /email', async () => {
    const response = await app.request('/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify({
        contexte: 'automations',
        ref: 'EMAIL-ACTION-1',
        destinataire: 'locataire@example.org',
        contenu: {
          action: 'Envoyer un e-mail de relance',
          objet: 'Relance',
          corps: 'Bonjour'
        }
      })
    })
    expect(response.status).toBe(201)
    const body = (await response.json()) as { data: { contenu: string } }
    expect(JSON.parse(body.data.contenu)).toMatchObject({
      action: 'Envoyer un e-mail de relance',
      objet: 'Relance',
      corps: 'Bonjour'
    })
  })
})
