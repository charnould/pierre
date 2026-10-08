import { afterEach, describe, expect, test } from 'bun:test'

import { createHttpChatTransport } from './http-chat-transport'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function stubFetch(handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = handler as unknown as typeof fetch
}

describe('createHttpChatTransport', () => {
  test('POSTs FormData to /chat and forwards NDJSON events', async () => {
    const bodies: FormData[] = []
    stubFetch(async (input, init) => {
      expect(String(input)).toBe('/chat')
      expect(init?.method).toBe('POST')
      bodies.push(init?.body as FormData)
      return new Response(
        '{"type":"text_delta","contentIndex":0,"delta":"ok"}\n{"type":"stream_end"}\n',
        {
          status: 200,
          headers: { 'Content-Type': 'application/x-ndjson' }
        }
      )
    })

    const events: string[] = []
    await createHttpChatTransport().stream(
      {
        configId: 'default',
        convId: '00000000-0000-4000-8000-000000000001',
        dataParam: '',
        message: 'bonjour',
        files: []
      },
      (event) => {
        events.push(event.type)
      },
      new AbortController().signal
    )

    expect(bodies[0]?.get('configId')).toBe('default')
    expect(bodies[0]?.get('conversationId')).toBe('00000000-0000-4000-8000-000000000001')
    expect(bodies[0]?.get('message')).toBe('bonjour')
    expect(events).toEqual(['text_delta', 'stream_end'])
  })

  test('aborts the HTTP stream via AbortSignal', async () => {
    const abort = new AbortController()
    stubFetch(async (_input, init) => {
      abort.abort()
      expect(init?.signal?.aborted).toBe(true)
      throw new DOMException('Aborted', 'AbortError')
    })

    await expect(
      createHttpChatTransport().stream(
        {
          configId: 'default',
          convId: '00000000-0000-4000-8000-000000000001',
          dataParam: '',
          message: 'bonjour',
          files: []
        },
        () => {},
        abort.signal
      )
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  test('posts questionnaire answers to /chat/responses', async () => {
    stubFetch(async (input, init) => {
      expect(String(input)).toBe('/chat/responses')
      expect(init?.method).toBe('POST')
      expect(JSON.parse(String(init?.body))).toEqual({
        conversationId: 'conv',
        requestId: 'req',
        responseSecret: 'secret',
        answers: [{ question: 'Q', answer: 'A' }]
      })
      return new Response(null, { status: 204 })
    })

    expect(
      await createHttpChatTransport().submitQuestionnaire({
        convId: 'conv',
        requestId: 'req',
        responseSecret: 'secret',
        answers: [{ question: 'Q', answer: 'A' }]
      })
    ).toBe(true)
  })
})
