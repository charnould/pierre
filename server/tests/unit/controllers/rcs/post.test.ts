import { afterAll, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { controller } from '../../../../controllers/rcs/post'
import type { User } from '../../../../utils/_schema'
import { datastorePaths } from '../../../../utils/paths'
import { setup } from '../../../../utils/setup'

const SERVICE = '_test_rcs_post'
const ROOT = datastorePaths(SERVICE).root
const originalService = Bun.env['SERVICE']
const originalToken = Bun.env['CM_PRODUCT_TOKEN']
const originalFrom = Bun.env['CM_FROM']

const app = new Hono<{ Variables: { user: User } }>()
app.use('*', async (c, next) => {
  c.set('user', {
    email: 'alice@example.org',
    isAdministrator: false,
    moduleIds: c.req.header('x-test-no-access') === 'true' ? [] : ['tickets'],
    chatbotIds: ['default'],
    passwordHash: 'unused'
  })
  await next()
})
app.post('/rcs', controller)

const postRcs = (idempotencyKey: string = Bun.randomUUIDv7(), hasAccess = true) =>
  app.request('/rcs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      ...(hasAccess ? {} : { 'x-test-no-access': 'true' })
    },
    body: JSON.stringify({
      contexte: 'tickets',
      ref: 'REQ-RCS',
      destinataire: '06 11 56 39 59',
      contenu: {
        action: 'Répondre au locataire',
        corps: 'Votre dossier est prêt.',
        choix: [{ id: 'confirmer', label: 'Confirmer' }]
      }
    })
  })

const acceptProviderRequest = (async (
  _url: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
) => {
  const reference = JSON.parse(String(init?.body)).messages.msg[0].reference
  return new Response(
    JSON.stringify({
      errorCode: 0,
      messages: { msg: [{ reference, status: 'Accepted', messageErrorCode: 0 }] }
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}) as typeof fetch

beforeAll(() => {
  Bun.env['SERVICE'] = SERVICE
  Bun.env['CM_PRODUCT_TOKEN'] = 'product-token-test'
  Bun.env['CM_FROM'] = 'PIERRE-TEST'
})

beforeEach(async () => {
  await rm(ROOT, { recursive: true, force: true })
  await setup()
})

afterAll(async () => {
  await rm(ROOT, { recursive: true, force: true })
  if (originalService === undefined) delete Bun.env['SERVICE']
  else Bun.env['SERVICE'] = originalService
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
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const [url, init] = fetchSpy.mock.calls[0]!
      expect(url).toBe('https://gw.messaging.cm.com/v1.0/message')
      expect(init).toBeDefined()
      const requestInit = init!
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
      expect((await postRcs(idempotencyKey)).status).toBe(201)
      expect(fetchSpy).toHaveBeenCalledTimes(2)
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
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('allows standard users to send through the provider', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(acceptProviderRequest)
    try {
      const response = await postRcs()
      expect(response.status).toBe(201)
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    } finally {
      fetchSpy.mockRestore()
    }
  })
})
