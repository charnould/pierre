import { afterAll, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller } from '../../../../controllers/rcs/post'
import type { User } from '../../../../utils/_schema'
import { list_activities } from '../../../../utils/activities/query'
import { setDatastoreRoot, testDatastorePaths } from '../../../../utils/paths'
import { TELEMETRY_URL } from '../../../../utils/send-telemetry'
import { setup } from '../../../../utils/setup'

const paths = testDatastorePaths('rcs_post')
const originalToken = Bun.env['CM_PRODUCT_TOKEN']
const originalFrom = Bun.env['CM_FROM']

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
    choices: [{ id: 'confirmer', label: 'Confirmer' }]
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
  Bun.env['CM_PRODUCT_TOKEN'] = 'product-token-test'
  Bun.env['CM_FROM'] = 'PIERRE-TEST'
})

beforeEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
  await setup()
})

afterAll(async () => {
  await rm(paths.root, { recursive: true, force: true })
  setDatastoreRoot(null)
  if (originalToken === undefined) delete Bun.env['CM_PRODUCT_TOKEN']
  else Bun.env['CM_PRODUCT_TOKEN'] = originalToken
  if (originalFrom === undefined) delete Bun.env['CM_FROM']
  else Bun.env['CM_FROM'] = originalFrom
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
              reference: expect.stringMatching(/^p\d+$/),
              richContent: {
                conversation: [
                  {
                    text: 'Votre dossier est prêt.',
                    suggestions: [
                      { action: 'Reply', label: 'Confirmer', postbackdata: 'confirmer' }
                    ]
                  }
                ]
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
      expect(JSON.parse(sent!.contenu).choices).toEqual([{ id: 'confirmer', label: 'Confirmer' }])
      expect((await postRcs(idempotencyKey)).status).toBe(201)
      expect(provider_calls(fetchSpy.mock.calls)).toHaveLength(2)
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('contains provider rejection at the boundary and records failure', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Rejected by provider' }), { status: 422 })
    )
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
      const sms = rows.find((row) => row.type === 'communication.sent' && row.channel === 'sms')
      expect(sms).toBeDefined()
      expect(JSON.parse(sms!.contenu)).toMatchObject({
        body: 'Votre dossier est prêt.',
        action: 'Répondre au locataire',
        fallback_from: expect.stringMatching(/^p\d+$/)
      })
      expect(
        rows.find(
          (row) =>
            row.thread_id === sms!.thread_id &&
            row.type === 'communication.failed' &&
            JSON.parse(row.contenu).reason === 'provider_not_configured'
        )
      ).toBeDefined()
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
