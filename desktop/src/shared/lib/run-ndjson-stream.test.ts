import { afterEach, describe, expect, test } from 'bun:test'

import { cancelNdjsonStream, runNdjsonStream } from './run-ndjson-stream'

const originalApi = globalThis.window?.api

afterEach(() => {
  if (originalApi) {
    ;(globalThis as typeof globalThis & { window: Window }).window.api = originalApi
  }
})

describe('runNdjsonStream', () => {
  test('parses NDJSON chunks and returns ok', async () => {
    let chunkCb: ((chunk: string) => void) | null = null
    let unsubscribed = false

    ;(globalThis as typeof globalThis & { window: Window }).window = {
      api: {
        onAiChunk: (_requestId: string, cb: (chunk: string) => void) => {
          chunkCb = cb
          return () => {
            unsubscribed = true
          }
        },
        cancelStream: async () => {}
      }
    } as unknown as Window & typeof globalThis

    const events: string[] = []

    const resultPromise = runNdjsonStream({
      requestId: 'req-1',
      start: async () => {
        chunkCb?.('{"type":"delta","content":"hi"}\n')
        return true
      },
      onEvent: (e) => {
        if (e.type === 'delta') events.push(e.content)
      }
    })

    const result = await resultPromise
    expect(result).toEqual({ ok: true, cancelled: false })
    expect(events).toEqual(['hi'])
    expect(unsubscribed).toBe(true)
  })

  test('returns cancelled when isCancelled after start', async () => {
    ;(globalThis as typeof globalThis & { window: Window }).window = {
      api: {
        onAiChunk: () => () => {},
        cancelStream: async () => {}
      }
    } as unknown as Window & typeof globalThis

    const result = await runNdjsonStream({
      requestId: 'req-2',
      start: async () => true,
      isCancelled: () => true,
      onEvent: () => {}
    })

    expect(result).toEqual({ ok: false, cancelled: true })
  })

  test('passes request id to start callback', async () => {
    ;(globalThis as typeof globalThis & { window: Window }).window = {
      api: {
        onAiChunk: () => () => {},
        cancelStream: async () => {}
      }
    } as unknown as Window & typeof globalThis

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

    ;(globalThis as typeof globalThis & { window: Window }).window = {
      api: {
        onAiChunk: () => () => {},
        cancelStream: async (requestId: string) => {
          cancelled = true
          cancelledRequestId = requestId
        }
      }
    } as unknown as Window & typeof globalThis

    cancelNdjsonStream('req-42')
    expect(cancelled).toBe(true)
    expect(cancelledRequestId).toBe('req-42')
  })
})
