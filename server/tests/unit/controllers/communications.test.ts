import { afterAll, beforeAll, describe, expect, it, spyOn } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller as courrierWebhook } from '../../../controllers/courrier/post.webhook'
import { controller as emailWebhook } from '../../../controllers/email/post.webhook'
import { controller as externalCommunication } from '../../../controllers/external-communication/post'
import { controller as rcsWebhook } from '../../../controllers/rcs/post.webhook'
import type { User } from '../../../utils/_schema'
import { list_activities } from '../../../utils/activities/query'
import { create_outbound } from '../../../utils/communications/storage'
import { setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'

const paths = testDatastorePaths('communication_controllers')
const SECRET = 'secret-test-key'
const originalSecret = Bun.env['CM_RCS_WEBHOOK_SECRET']
const originalFakeSecret = Bun.env['FAKE_WEBHOOK_KEY']

beforeAll(async () => {
  setDatastoreRoot(paths.root)
  Bun.env['CM_RCS_WEBHOOK_SECRET'] = SECRET
  Bun.env['FAKE_WEBHOOK_KEY'] = SECRET
  await rm(paths.root, { recursive: true, force: true })
  await setup()
})

afterAll(async () => {
  await rm(paths.root, { recursive: true, force: true })
  setDatastoreRoot(null)
  if (originalSecret === undefined) delete Bun.env['CM_RCS_WEBHOOK_SECRET']
  else Bun.env['CM_RCS_WEBHOOK_SECRET'] = originalSecret
  if (originalFakeSecret === undefined) delete Bun.env['FAKE_WEBHOOK_KEY']
  else Bun.env['FAKE_WEBHOOK_KEY'] = originalFakeSecret
})

describe('webhooks de communication', () => {
  it('refuse un webhook email sans signature', async () => {
    const app = new Hono().post('/webhook/email', emailWebhook)
    const response = await app.request('/webhook/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    })
    expect(response.status).toBe(401)
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

  it('enregistre un échec RCS une seule fois, CM envoie le SMS', async () => {
    Bun.env['CM_RCS_PRODUCT_TOKEN'] = 'token'
    Bun.env['CM_RCS_FROM'] = 'PIERRE'
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async (
      _url: unknown,
      init?: { body?: unknown }
    ) => {
      const reference = JSON.parse(String(init?.body)).messages.msg[0].reference
      return new Response(
        JSON.stringify({
          errorCode: 0,
          messages: { msg: [{ reference, status: 'Accepted', messageErrorCode: 0 }] }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }) as typeof fetch)
    const rcs = create_outbound({
      actor: 'alice@example.org',
      contexte: 'automations',
      ref: 'RCS-FALLBACK',
      type: 'rcs',
      destinataire: '+33612345678',
      contenu: JSON.stringify({
        version: 2,
        sender: 'user:alice@example.org',
        body: 'Relance',
        sms_fallback: 'Relance'
      }),
      idempotency_key: Bun.randomUUIDv7()
    })
    const app = new Hono().post('/webhook/rcs', rcsWebhook)
    const request = () =>
      app.request('/webhook/rcs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Webhook-Secret': SECRET },
        body: JSON.stringify({
          reference: `${rcs.id}`,
          status: { code: 1 },
          received: '2030-08-26T20:00:00Z'
        })
      })

    expect((await request()).status).toBe(200)
    expect((await request()).status).toBe(200)

    const rows = list_activities('alice@example.org', {
      rattachement: 'automations:RCS-FALLBACK',
      limit: 10
    })
    expect(rows.filter((row) => row.channel === 'sms')).toHaveLength(0)
    expect(
      rows.filter((row) => row.type === 'communication.failed' && row.thread_id === rcs.thread_id)
    ).toHaveLength(1)
    expect(
      fetchSpy.mock.calls.filter((call) => String(call[0]).includes('gw.messaging.cm.com'))
    ).toHaveLength(0)
    fetchSpy.mockRestore()
  })

  it('mappe les statuts CM et rattache une réponse au thread référencé', async () => {
    const activity = create_outbound({
      actor: 'alice@example.org',
      contexte: 'automations',
      ref: 'RCS-1',
      type: 'rcs',
      destinataire: '+33612345678',
      contenu: JSON.stringify({
        version: 2,
        sender: 'user:alice@example.org',
        body: 'Choisissez',
        choices: [{ type: 'reply', label: 'Être rappelé' }]
      }),
      idempotency_key: Bun.randomUUIDv7()
    })
    const app = new Hono().post('/webhook/rcs', rcsWebhook)
    const headers = { 'Content-Type': 'application/json', 'Webhook-Secret': SECRET }

    expect(
      (
        await app.request('/webhook/rcs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: `${activity.id}`, status: { code: 2 } })
        })
      ).status
    ).toBe(401)
    expect(
      (
        await app.request('/webhook/rcs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Webhook-Secret': 'wrong' },
          body: JSON.stringify({ reference: `${activity.id}`, status: { code: 2 } })
        })
      ).status
    ).toBe(401)
    expect(
      (
        await app.request(`/webhook/rcs?webhook_secret=${SECRET}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: `${activity.id}`,
            status: { code: 2 },
            received: '2030-08-26T19:59:00Z'
          })
        })
      ).status
    ).toBe(200)

    const status = await app.request('/webhook/rcs', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        reference: `${activity.id}`,
        status: { code: 2 },
        received: '2030-08-26T20:00:00Z'
      })
    })
    expect(status.status).toBe(200)
    expect(
      list_activities('alice@example.org', {
        rattachement: activity.rattachement,
        limit: 10
      }).some((row) => row.type === 'communication.ok' && row.thread_id === activity.thread_id)
    ).toBe(true)

    const inboundPayload = {
      reference: Bun.randomUUIDv7(),
      messageContext: `${activity.id}`,
      from: { number: '+33612345678' },
      timeUtc: '2030-08-26T20:01:00Z',
      event: { custom: { postbackdata: 'Être rappelé' } }
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
            reference: Bun.randomUUIDv7(),
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
    const received = rows.filter((row) => row.type === 'communication.received')
    expect(received.every((row) => row.thread_id === activity.thread_id)).toBe(true)
    expect(received.some((row) => row.contenu.includes('Être rappelé'))).toBe(true)
    expect(received.some((row) => row.contenu.includes('confirmer'))).toBe(true)
    expect(received).toHaveLength(2)
  })

  it('rattache un texte RCS au fil cité, sinon au plus récent', async () => {
    const first = create_outbound({
      actor: 'alice@example.org',
      contexte: 'automations',
      ref: 'RCS-LINK-1',
      type: 'rcs',
      destinataire: '+33698765432',
      contenu: JSON.stringify({ version: 2, body: 'Premier' }),
      idempotency_key: Bun.randomUUIDv7()
    })
    const second = create_outbound({
      actor: 'alice@example.org',
      contexte: 'automations',
      ref: 'RCS-LINK-2',
      type: 'rcs',
      destinataire: '+33698765432',
      contenu: JSON.stringify({ version: 2, body: 'Second' }),
      idempotency_key: Bun.randomUUIDv7()
    })
    const app = new Hono().post('/webhook/rcs', rcsWebhook)
    const headers = { 'Content-Type': 'application/json', 'Webhook-Secret': SECRET }
    const timeUtc = new Date().toISOString().replace(/\.\d{3}Z$/, '')
    expect(
      (
        await app.request('/webhook/rcs', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            from: { number: '+33698765432' },
            message: { text: 'Bien reçu' },
            timeUtc
          })
        })
      ).status
    ).toBe(200)
    expect(
      list_activities('alice@example.org', {
        rattachement: 'automations:RCS-LINK-2',
        limit: 10
      }).some((row) => row.type === 'communication.received' && row.thread_id === second.thread_id)
    ).toBe(true)
    expect(
      (
        await app.request('/webhook/rcs', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            reference: `${first.id}`,
            from: { number: '+33698765432' },
            message: { text: 'Sur le premier' },
            timeUtc
          })
        })
      ).status
    ).toBe(200)
    expect(
      list_activities('alice@example.org', {
        rattachement: 'automations:RCS-LINK-1',
        limit: 10
      }).some(
        (row) =>
          row.type === 'communication.received' &&
          row.thread_id === first.thread_id &&
          row.contenu.includes('premier')
      )
    ).toBe(true)
  })
})

describe('POST /communications/external et action', () => {
  const app = new Hono<{ Variables: { user: User } }>()
  app.use('*', async (c, next) => {
    c.set('user', {
      email: 'alice@example.org',
      isAdministrator: false,
      moduleIds: ['tickets', 'automations'],
      chatbotIds: []
    })
    await next()
  })
  app.post('/communications/external', externalCommunication)

  it('journalise un courriel déjà envoyé (communication.sent) avec action', async () => {
    const response = await app.request('/communications/external', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': Bun.randomUUIDv7()
      },
      body: JSON.stringify({
        channel: 'email',
        contexte: 'automations',
        ref: 'MAILTO-1',
        destinataire: 'caf@example.fr',
        contenu: {
          action: 'Contacter la CAF',
          subject: 'Dossier APL',
          body: 'Merci de rétablir l’APL.'
        }
      })
    })
    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      data: { type: string; channel: string; contenu: string }
    }
    expect(body.data.type).toBe('communication.sent')
    expect(body.data.channel).toBe('email')
    expect(JSON.parse(body.data.contenu)).toMatchObject({
      version: 2,
      action: 'Contacter la CAF',
      subject: 'Dossier APL',
      body: 'Merci de rétablir l’APL.'
    })
    expect(JSON.parse(body.data.contenu).choices).toBeUndefined()
  })

  it('journalise un RCS avec boutons sans exiger sms_fallback', async () => {
    const response = await app.request('/communications/external', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': Bun.randomUUIDv7()
      },
      body: JSON.stringify({
        channel: 'rcs',
        contexte: 'tickets',
        ref: 'RCS-JOURNAL-1',
        destinataire: '+33600000000',
        contenu: {
          body: 'Choisissez',
          choices: [{ type: 'reply', label: 'Être rappelé' }]
        }
      })
    })
    expect(response.status).toBe(201)
    const body = (await response.json()) as { data: { channel: string; contenu: string } }
    expect(body.data.channel).toBe('rcs')
    expect(JSON.parse(body.data.contenu)).toMatchObject({
      body: 'Choisissez',
      choices: [{ type: 'reply', label: 'Être rappelé' }]
    })
    expect(JSON.parse(body.data.contenu).sms_fallback).toBeUndefined()
  })

  it('journalise un RCS avec sender et application externe', async () => {
    const response = await app.request('/communications/external', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': Bun.randomUUIDv7()
      },
      body: JSON.stringify({
        channel: 'rcs',
        contexte: 'tickets',
        ref: 'RCS-JOURNAL-2',
        destinataire: '+33600000000',
        contenu: {
          body: 'Choisissez',
          sender: 'Alice <alice@bailleur.fr>',
          external_application: { name: 'Izy' }
        }
      })
    })
    expect(response.status).toBe(201)
    const body = (await response.json()) as { data: { contenu: string } }
    expect(JSON.parse(body.data.contenu)).toMatchObject({
      body: 'Choisissez',
      sender: 'Alice <alice@bailleur.fr>',
      provider: 'Izy'
    })
  })

  it('n’accepte pas provider comme alias de external_application', async () => {
    const response = await app.request('/communications/external', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': Bun.randomUUIDv7()
      },
      body: JSON.stringify({
        channel: 'rcs',
        contexte: 'tickets',
        ref: 'RCS-JOURNAL-PROVIDER',
        destinataire: '+33600000000',
        contenu: { body: 'Choisissez', provider: 'Izy' }
      })
    })
    expect(response.status).toBe(201)
    expect(
      JSON.parse(((await response.json()) as { data: { contenu: string } }).data.contenu).provider
    ).toBeUndefined()
  })

  it('refuse de journaliser un SMS autonome', async () => {
    const response = await app.request('/communications/external', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': Bun.randomUUIDv7()
      },
      body: JSON.stringify({
        channel: 'sms',
        contexte: 'tickets',
        ref: 'SMS-JOURNAL',
        destinataire: '+33600000000',
        contenu: { body: 'Secours' }
      })
    })
    expect(response.status).toBe(400)
  })

  it('refuse des boutons RCS sur un courriel', async () => {
    const response = await app.request('/communications/external', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': Bun.randomUUIDv7()
      },
      body: JSON.stringify({
        channel: 'email',
        contexte: 'automations',
        ref: 'MAILTO-CHOICES',
        destinataire: 'caf@example.fr',
        contenu: {
          subject: 'Dossier APL',
          body: 'Merci de rétablir l’APL.',
          choices: [{ type: 'reply', label: 'Envoyer le justificatif' }]
        }
      })
    })
    expect(response.status).toBe(400)
  })

  it('accepte une communication externe avec objet seul', async () => {
    const response = await app.request('/communications/external', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': Bun.randomUUIDv7()
      },
      body: JSON.stringify({
        channel: 'email',
        contexte: 'automations',
        ref: 'MAILTO-2',
        destinataire: 'caf@example.fr',
        contenu: { subject: 'Dossier APL', body: '' }
      })
    })
    expect(response.status).toBe(201)
  })

  it('journalise une réponse locataire externe sans coordonnée connue', async () => {
    const response = await app.request('/communications/external', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': Bun.randomUUIDv7()
      },
      body: JSON.stringify({
        channel: 'email',
        contexte: 'tickets',
        ref: 'EXTERNAL-NO-DESTINATION',
        contenu: {
          body: 'Votre demande a été traitée.',
          external_application: { name: 'Aravis' }
        }
      })
    })
    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      data: { destinataire: string | null; contenu: string }
    }
    expect(body.data.destinataire).toBeNull()
    expect(JSON.parse(body.data.contenu)).toMatchObject({
      provider: 'Aravis'
    })
  })

  it('journalise un courriel importé (communication.imported)', async () => {
    const response = await app.request('/communications/external', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': Bun.randomUUIDv7()
      },
      body: JSON.stringify({
        channel: 'email',
        imported: true,
        contexte: 'tickets',
        ref: 'EML-1',
        destinataire: 'Bob <bob@locataire.fr>',
        contenu: {
          subject: 'Relance loyer',
          body: 'Merci de régulariser.',
          sender: 'Alice <alice@bailleur.fr>'
        }
      })
    })
    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      data: { type: string; channel: string; destinataire: string | null; contenu: string }
    }
    expect(body.data.type).toBe('communication.imported')
    expect(body.data.channel).toBe('email')
    expect(body.data.destinataire).toBe('Bob <bob@locataire.fr>')
    expect(JSON.parse(body.data.contenu)).toMatchObject({
      version: 2,
      subject: 'Relance loyer',
      body: 'Merci de régulariser.',
      sender: 'Alice <alice@bailleur.fr>'
    })
  })

  it('journalise chaque canal sans fournisseur et reste idempotent', async () => {
    for (const channel of ['rcs', 'email', 'postal_letter'] as const) {
      const idempotencyKey = Bun.randomUUIDv7()
      const destinataire =
        channel === 'rcs'
          ? '+33600000000'
          : channel === 'email'
            ? 'locataire@example.org'
            : '1 rue du Test, 75001 Paris'
      const request = () =>
        app.request('/communications/external', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey
          },
          body: JSON.stringify({
            channel,
            contexte: 'tickets',
            ref: `EXTERNAL-${channel}`,
            destinataire,
            contenu: { body: `Réponse ${channel}` }
          })
        })

      const first = await request()
      expect(first.status).toBe(201)
      const firstBody = (await first.json()) as {
        data: { id: number; type: string; channel: string }
      }
      expect(firstBody.data).toMatchObject({ type: 'communication.sent', channel })

      const replay = await request()
      expect(replay.status).toBe(201)
      expect((await replay.json()) as unknown).toMatchObject({
        data: { id: firstBody.data.id, type: 'communication.sent', channel }
      })
    }
  })
})
