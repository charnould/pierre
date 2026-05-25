import { afterEach, describe, expect, test } from 'bun:test'

import { cancelAiStream, runAiStream } from './run-ai-stream'

const originalApi = globalThis.window?.api

afterEach(() => {
  if (originalApi) {
    ;(globalThis as typeof globalThis & { window: Window }).window.api = originalApi
  }
})

describe('runAiStream', () => {
  test('parses NDJSON chunks and returns ok', async () => {
    let chunkCb: ((chunk: string) => void) | null = null

    ;(globalThis as typeof globalThis & { window: Window }).window = {
      api: {
        onAiChunk: (cb: (chunk: string) => void) => {
          chunkCb = cb
        },
        cancelStream: async () => {}
      }
    } as unknown as Window & typeof globalThis

    const events: string[] = []

    const resultPromise = runAiStream({
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
  })

  test('returns cancelled when isCancelled after start', async () => {
    ;(globalThis as typeof globalThis & { window: Window }).window = {
      api: {
        onAiChunk: () => {},
        cancelStream: async () => {}
      }
    } as unknown as Window & typeof globalThis

    const result = await runAiStream({
      start: async () => true,
      isCancelled: () => true,
      onEvent: () => {}
    })

    expect(result).toEqual({ ok: false, cancelled: true })
  })
})

describe('cancelAiStream', () => {
  test('calls cancelStream and clears listener', () => {
    let lastCb: ((chunk: string) => void) | null = null
    let cancelled = false

    ;(globalThis as typeof globalThis & { window: Window }).window = {
      api: {
        onAiChunk: (cb: (chunk: string) => void) => {
          lastCb = cb
        },
        cancelStream: async () => {
          cancelled = true
        }
      }
    } as unknown as Window & typeof globalThis

    const active = () => {}
    window.api.onAiChunk(active)
    expect(lastCb).toBe(active)

    cancelAiStream()
    expect(cancelled).toBe(true)
    expect(lastCb).not.toBe(active)
  })
})
