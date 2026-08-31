import { afterEach, describe, expect, test } from 'bun:test'

import { cancelNdjsonStream, runNdjsonStream } from './run-ndjson-stream'

let didStubWindow = false
let windowBeforeStub: typeof globalThis.window | undefined

function stubWindowApi(api: Record<string, unknown>) {
  windowBeforeStub = globalThis.window
  didStubWindow = true
  ;(globalThis as typeof globalThis & { window: Window }).window = {
    api
  } as unknown as Window & typeof globalThis
}

afterEach(() => {
  if (!didStubWindow) return
  if (windowBeforeStub) globalThis.window = windowBeforeStub
  else delete (globalThis as { window?: Window }).window
  didStubWindow = false
  windowBeforeStub = undefined
})

describe('runNdjsonStream', () => {
  test('parses NDJSON chunks and returns ok', async () => {
    let chunkCb: ((chunk: string) => void) | null = null
    let unsubscribed = false

    stubWindowApi({
      onAiChunk: (_requestId: string, cb: (chunk: string) => void) => {
        chunkCb = cb
        return () => {
          unsubscribed = true
        }
      },
      cancelStream: async () => {}
    })

    const events: string[] = []

    const resultPromise = runNdjsonStream({
      requestId: 'req-1',
      start: async () => {
        chunkCb?.('{"type":"text_delta","contentIndex":0,"delta":"hi"}\n')
        return true
      },
      onEvent: (e) => {
        if (e.type === 'text_delta') events.push(e.delta)
      }
    })

    const result = await resultPromise
    expect(result).toEqual({ ok: true, cancelled: false })
    expect(events).toEqual(['hi'])
    expect(unsubscribed).toBe(true)
  })

  test('returns cancelled when isCancelled after start', async () => {
    stubWindowApi({
      onAiChunk: () => () => {},
      cancelStream: async () => {}
    })

    const result = await runNdjsonStream({
      requestId: 'req-2',
      start: async () => true,
      isCancelled: () => true,
      onEvent: () => {}
    })

    expect(result).toEqual({ ok: false, cancelled: true })
  })

  test('passes request id to start callback', async () => {
    stubWindowApi({
      onAiChunk: () => () => {},
      cancelStream: async () => {}
    })

    let seenRequestId = ''
    const result = await runNdjsonStream({
      requestId: 'req-pass-through',
      start: async (requestId) => {
        seenRequestId = requestId
        return true
      },
      onEvent: () => {}
    })

    expect(seenRequestId).toBe('req-pass-through')
    expect(result).toEqual({ ok: true, cancelled: false })
  })
})

describe('cancelNdjsonStream', () => {
  test('calls cancelStream for the request id', () => {
    let cancelledRequestId = ''
    let cancelled = false

    stubWindowApi({
      onAiChunk: () => () => {},
      cancelStream: async (requestId: string) => {
        cancelled = true
        cancelledRequestId = requestId
      }
    })

    cancelNdjsonStream('req-42')
    expect(cancelled).toBe(true)
    expect(cancelledRequestId).toBe('req-42')
  })
})
