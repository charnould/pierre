import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller } from '../../../../controllers/rcs/post'
import type { User } from '../../../../utils/_schema'
import { list_activities } from '../../../../utils/activities/query'
import { claim_outbound_dispatch, create_outbound } from '../../../../utils/communications/storage'
import { insert_contact_if_absent } from '../../../../utils/contacts'
import { setDatastoreRoot, testDatastorePaths } from '../../../../utils/paths'
import { emptyProviders, writeProviders } from '../../../../utils/providers'
import { TELEMETRY_URL } from '../../../../utils/send-telemetry'
import { setup } from '../../../../utils/setup'

const paths = testDatastorePaths('rcs_post')

const app = new Hono<{ Variables: { user: User } }>()
app.use('*', async (c, next) => {
  c.set('user', {
    email: 'alice@example.org',
    isAdministrator: false,
    moduleIds: c.req.header('x-test-no-access') === 'true' ? [] : ['tickets'],
    chatbotIds: ['default']
  })
  await next()
})
app.post('/rcs', controller)

const validBody = {
  contexte: 'tickets',
  ref: 'REQ-RCS',
  destinataire: '06 11 56 39 59',
  contenu: {
    action: 'Répondre au locataire',
    body: 'Votre dossier est prêt.',
    sms_fallback: 'Texte SMS',
    choices: [{ type: 'reply', label: 'Confirmer' }]
  }
}

const postRcs = (
  idempotencyKey: string = Bun.randomUUIDv7(),
  hasAccess = true,
  body: unknown = validBody
) =>
  app.request('/rcs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      ...(hasAccess ? {} : { 'x-test-no-access': 'true' })
    },
    body: JSON.stringify(body)
  })

const acceptProviderRequest = (async (
  url: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
) => {
  if (String(url) === TELEMETRY_URL) return new Response(null, { status: 204 })
  const reference = JSON.parse(String(init?.body)).messages.msg[0].reference
  return new Response(
    JSON.stringify({
      errorCode: 0,
      messages: { msg: [{ reference, status: 'Accepted', messageErrorCode: 0 }] }
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}) as typeof fetch

const provider_calls = (calls: ReadonlyArray<readonly unknown[]>) =>
  calls.filter((call) => String(call[0]) !== TELEMETRY_URL)

beforeAll(() => {
  setDatastoreRoot(paths.root)
})

beforeEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
  await setup()
  writeProviders({
    ...emptyProviders(),
    rcsToken: 'product-token-test',
    rcsFrom: 'PIERRE-TEST',
    rcsSecret: 'rcs-secret'
  })
})

afterAll(async () => {
  await rm(paths.root, { recursive: true, force: true })
  setDatastoreRoot(null)
})

describe('POST /rcs provider boundary', () => {
  it('rejects users without access to the activity module', async () => {
    const response = await postRcs(Bun.randomUUIDv7(), false)
    expect(response.status).toBe(403)
  })

  it('rejects the removed corps payload', async () => {
    const response = await postRcs(Bun.randomUUIDv7(), true, {
      ...validBody,
      contenu: { corps: 'Ancien contrat' }
    })
    expect(response.status).toBe(400)
  })

  it('rejects the stored { id, label } reply shape on write', async () => {
    const response = await postRcs(Bun.randomUUIDv7(), true, {
      ...validBody,
      contenu: { body: 'Choisissez', choices: [{ id: 'rappeler', label: 'Être rappelé' }] }
    })
    expect(response.status).toBe(400)
  })

  it('accepts a body-only RCS payload and stores the body as SMS fallback', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(acceptProviderRequest)
    try {
      const response = await postRcs(Bun.randomUUIDv7(), true, {
        ...validBody,
        contenu: { body: 'Votre dossier est prêt.' }
      })
      expect(response.status).toBe(201)
      const rows = list_activities('alice@example.org', {
        rattachement: 'tickets:REQ-RCS',
        limit: 10
      })
      const sent = rows.find((row) => row.type === 'communication.sent' && row.channel === 'rcs')
      expect(JSON.parse(sent!.contenu).sms_fallback).toBe('Votre dossier est prêt.')
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('sends the wrapped CM payload and records a sent activity', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(acceptProviderRequest)
    try {
      const idempotencyKey = Bun.randomUUIDv7()
      const response = await postRcs(idempotencyKey)
      expect(response.status).toBe(201)
      expect((await response.json()) as unknown).toMatchObject({
        data: {
          auteur: 'user:alice@example.org',
          destinataire: '+33611563959',
          type: 'communication.sent',
          channel: 'rcs'
        }
      })
      expect(provider_calls(fetchSpy.mock.calls)).toHaveLength(1)
      const [url, init] = provider_calls(fetchSpy.mock.calls)[0] as [string, RequestInit]
      expect(url).toBe('https://gw.messaging.cm.com/v1.0/message')
      expect(init).toBeDefined()
      const requestInit = init
      expect((requestInit.headers as Record<string, string>)['X-CM-PRODUCTTOKEN']).toBe(
        'product-token-test'
      )
      expect(JSON.parse(String(requestInit.body))).toMatchObject({
        messages: {
          msg: [
            {
              from: 'PIERRE-TEST',
              to: [{ number: '0033611563959' }],
              reference: expect.stringMatching(/^\d+$/),
              allowedChannels: ['RCS'],
              body: { type: 'auto', content: 'Texte SMS' },
              richContent: {
                conversation: [{ text: 'Votre dossier est prêt.' }],
                suggestions: [{ action: 'Reply', label: 'Confirmer', postbackdata: 'Confirmer' }]
              }
            }
          ]
        }
      })
      const rows = list_activities('alice@example.org', {
        rattachement: 'tickets:REQ-RCS',
        limit: 10
      })
      expect(rows.some((row) => row.channel === 'sms')).toBe(false)
      const sent = rows.find((row) => row.type === 'communication.sent' && row.channel === 'rcs')
      expect(JSON.parse(sent!.contenu).choices).toEqual([{ type: 'reply', label: 'Confirmer' }])
      expect(JSON.parse(sent!.contenu).sms_fallback).toBe('Texte SMS')
      expect((await postRcs(idempotencyKey)).status).toBe(201)
      expect(provider_calls(fetchSpy.mock.calls)).toHaveLength(1)
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('retourne une erreur rejouable quand le dispatch est déjà réservé', async () => {
    const idempotencyKey = Bun.randomUUIDv7()
    const activity = create_outbound({
      actor: 'alice@example.org',
      contexte: 'tickets',
      ref: validBody.ref,
      type: 'rcs',
      destinataire: validBody.destinataire,
      contenu: JSON.stringify(validBody.contenu),
      idempotency_key: idempotencyKey
    })
    expect(claim_outbound_dispatch(activity.id)).toBe('claimed')
    const fetchSpy = spyOn(globalThis, 'fetch')
    try {
      const response = await postRcs(idempotencyKey)
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

  it('ne déclasse pas le numéro sur un rejet synchrone du gateway', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async (
      url: Parameters<typeof fetch>[0],
      _init?: Parameters<typeof fetch>[1]
    ) => {
      if (String(url) === TELEMETRY_URL) return new Response(null, { status: 204 })
      return new Response(JSON.stringify({ message: 'Rejected by provider' }), { status: 422 })
    }) as typeof fetch)
    try {
      const response = await postRcs()
      expect(response.status).toBe(502)
      expect((await response.json()) as unknown).toMatchObject({
        error: { code: 'cm_rejected' },
        data: { type: 'communication.failed', channel: 'rcs' }
      })
      const rows = list_activities('alice@example.org', {
        rattachement: 'tickets:REQ-RCS',
        limit: 10
      })
      expect(rows.some((row) => row.channel === 'sms')).toBe(false)
      expect(
        rows.find(
          (row) =>
            row.type === 'communication.failed' && JSON.parse(row.contenu).reason === 'failed'
        )
      ).toBeDefined()
      expect(provider_calls(fetchSpy.mock.calls)).toHaveLength(1)
      const db = new Database(paths.database, { readonly: true })
      const contact = db
        .query<{ status: string }, [string]>('SELECT status FROM contacts WHERE value = ?')
        .get('+33611563959')
      db.close()
      expect(contact?.status).not.toBe('sms_compatible')
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('rejoue une indisponibilité transitoire sans terminaliser la communication', async () => {
    let attempts = 0
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async (
      url: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1]
    ) => {
      if (String(url) === TELEMETRY_URL) return new Response(null, { status: 204 })
      attempts += 1
      if (attempts === 1) throw new TypeError('network unavailable')
      return acceptProviderRequest(url, init)
    }) as typeof fetch)
    try {
      const idempotencyKey = Bun.randomUUIDv7()
      const failed = await postRcs(idempotencyKey)
      expect(failed.status).toBe(503)
      expect(failed.headers.get('retry-after')).toBe('30')
      expect(await failed.json()).toMatchObject({
        error: { code: 'cm_unavailable' },
        data: { type: 'communication.sent', channel: 'rcs' }
      })
      expect(
        list_activities('alice@example.org', {
          rattachement: 'tickets:REQ-RCS',
          limit: 10
        }).some((row) => row.type === 'communication.failed')
      ).toBe(false)

      expect((await postRcs(idempotencyKey)).status).toBe(201)
      expect(provider_calls(fetchSpy.mock.calls)).toHaveLength(2)
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('envoie un SMS quand le numéro est déjà sms_compatible', async () => {
    const db = new Database(paths.database)
    insert_contact_if_absent(db, '+33611563959', 'sms_compatible')
    db.close()
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(acceptProviderRequest)
    try {
      const response = await postRcs()
      expect(response.status).toBe(201)
      expect((await response.json()) as unknown).toMatchObject({
        data: { channel: 'sms', type: 'communication.sent' }
      })
      const calls = provider_calls(fetchSpy.mock.calls)
      expect(calls).toHaveLength(1)
      const message = JSON.parse(String((calls[0] as [string, RequestInit])[1].body)).messages
        .msg[0]
      expect(message.allowedChannels).toEqual(['SMS'])
      expect(message.body).toEqual({ type: 'auto', content: 'Texte SMS' })
      expect(message.richContent).toBeUndefined()
      const rows = list_activities('alice@example.org', {
        rattachement: 'tickets:REQ-RCS',
        limit: 10
      })
      const sent = rows.find((row) => row.type === 'communication.sent')
      expect(JSON.parse(sent!.contenu).choices).toBeUndefined()
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('allows standard users to send through the provider', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(acceptProviderRequest)
    try {
      const response = await postRcs()
      expect(response.status).toBe(201)
      expect(provider_calls(fetchSpy.mock.calls)).toHaveLength(1)
    } finally {
      fetchSpy.mockRestore()
    }
  })
})
