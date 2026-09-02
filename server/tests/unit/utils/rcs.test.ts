import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'

import { RcsSendError, send_rcs_message } from '../../../utils/rcs/send'
import { new_rcs_reference, to_cm_number, wrap_rcs_message } from '../../../utils/rcs/wrap'

const PHONE_NATIONAL = '0621804969'
const PHONE_SPACED = '06 21 80 49 69'
const PHONE_E164 = '+33621804969'
const PHONE_CM = '0033621804969'

describe('wrap', () => {
  it('normalizes national FR mobile to CM 00 prefix', () => {
    expect(to_cm_number(PHONE_NATIONAL)).toBe(PHONE_CM)
    expect(to_cm_number(PHONE_SPACED)).toBe(PHONE_CM)
  })

  it('converts E.164 + to 00', () => {
    expect(to_cm_number(PHONE_E164)).toBe(PHONE_CM)
  })

  it('accepts already-CM 00 prefix', () => {
    expect(to_cm_number(PHONE_CM)).toBe(PHONE_CM)
  })

  it('rejects a landline', () => {
    expect(to_cm_number('01 42 00 00 00')).toBe('')
  })

  it('wraps richContent without stripping fields', () => {
    const richContent = { conversation: [{ text: 'hello', extra: true }] }
    const payload = wrap_rcs_message({
      from: 'PIERRE',
      phone: PHONE_CM,
      richContent,
      body: { content: 'fallback' },
      reference: 'jabc'
    })
    expect(payload.messages.msg[0]).toMatchObject({
      from: 'PIERRE',
      to: [{ number: PHONE_CM }],
      allowedChannels: ['RCS'],
      body: { type: 'auto', content: 'fallback' },
      richContent,
      reference: 'jabc'
    })
  })

  it('builds an alphanumeric reference of at most 32 chars', () => {
    const reference = new_rcs_reference()
    expect(reference.length).toBeLessThanOrEqual(32)
    expect(reference).toMatch(/^[a-zA-Z0-9]+$/)
  })
})

describe('send_rcs_message (fetch mocked, no live send)', () => {
  const originalToken = Bun.env['CM_PRODUCT_TOKEN']
  const originalFrom = Bun.env['CM_FROM']
  let fetchSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    Bun.env['CM_PRODUCT_TOKEN'] = 'test-token'
    Bun.env['CM_FROM'] = 'PIERRE'
    fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
      Object.assign(
        () => {
          throw new Error('live CM.com fetch is forbidden in tests')
        },
        { preconnect: () => {} }
      )
    )
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    if (originalToken === undefined) delete Bun.env['CM_PRODUCT_TOKEN']
    else Bun.env['CM_PRODUCT_TOKEN'] = originalToken
    if (originalFrom === undefined) delete Bun.env['CM_FROM']
    else Bun.env['CM_FROM'] = originalFrom
  })

  it('throws not_configured when the product token is empty', async () => {
    Bun.env['CM_PRODUCT_TOKEN'] = ''
    await expect(
      send_rcs_message({
        phone: PHONE_CM,
        richContent: { conversation: [{ text: 'hello' }] },
        reference: 'jtest'
      })
    ).rejects.toMatchObject({ code: 'not_configured', status: 503 })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('posts the wrapped payload to the CM gateway', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          errorCode: 0,
          messages: { msg: [{ reference: 'jtest', status: 'Accepted', messageErrorCode: 0 }] }
        }),
        { status: 200 }
      )
    )
    const result = await send_rcs_message({
      phone: PHONE_CM,
      richContent: { conversation: [{ text: 'hello' }] },
      body: { content: 'fallback' },
      reference: 'jtest'
    })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://gw.messaging.cm.com/v1.0/message')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['X-CM-PRODUCTTOKEN']).toBe('test-token')
    expect(JSON.parse(String(init.body))).toMatchObject({
      messages: {
        msg: [{ to: [{ number: PHONE_CM }], allowedChannels: ['RCS'], reference: 'jtest' }]
      }
    })
    expect(result.status).toBe(200)
  })

  it('throws cm_rejected when the gateway returns 400', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ details: 'Unknown recipient' }), { status: 400 })
    )
    try {
      await send_rcs_message({
        phone: PHONE_CM,
        richContent: { conversation: [{ text: 'hello' }] },
        reference: 'jtest'
      })
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(RcsSendError)
      expect(error).toMatchObject({
        code: 'cm_rejected',
        status: 400,
        message: 'Unknown recipient'
      })
    }
  })

  it('throws cm_rejected when a successful HTTP response rejects the message', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          errorCode: 0,
          messages: { msg: [{ status: 'Rejected', messageErrorCode: 201 }] }
        }),
        { status: 200 }
      )
    )
    await expect(
      send_rcs_message({
        phone: PHONE_CM,
        richContent: { conversation: [{ text: 'hello' }] },
        reference: 'jtest'
      })
    ).rejects.toMatchObject({ code: 'cm_rejected', status: 502 })
  })

  it('rejects an accepted label without explicit zero result codes', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          errorCode: null,
          messages: {
            msg: [{ reference: 'jtest', status: 'Accepted', messageErrorCode: false }]
          }
        }),
        { status: 200 }
      )
    )
    await expect(
      send_rcs_message({
        phone: PHONE_CM,
        richContent: { conversation: [{ text: 'hello' }] },
        reference: 'jtest'
      })
    ).rejects.toMatchObject({ code: 'cm_rejected', status: 502 })
  })
})
