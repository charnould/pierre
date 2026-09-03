import { describe, expect, spyOn, test } from 'bun:test'

import { Hono } from 'hono'

import type { AIContext } from '../../utils/_schema'
import { streamChatRequest } from '../../utils/stream-chat-request'

function lifecycle() {
  let claimed = false
  let rollbacks = 0
  return {
    value: {
      claim() {
        claimed = true
      },
      async rollback() {
        if (!claimed) rollbacks++
      }
    },
    claimed: () => claimed,
    rollbacks: () => rollbacks
  }
}

describe('streamChatRequest attachment ownership', () => {
  test('rolls back when persisting the user turn fails before VM acquisition', async () => {
    const transaction = lifecycle()
    const app = new Hono()
    app.onError(() => new Response('failed', { status: 500 }))
    app.post('/ai', (c) =>
      streamChatRequest(c, {} as AIContext, [], transaction.value, {
        saveReply: async () => {
          throw new Error('database unavailable')
        },
        streamAnswer: () => ({ textStream: (async function* () {})() })
      })
    )

    expect((await app.request('/ai', { method: 'POST' })).status).toBe(500)
    expect(transaction.rollbacks()).toBe(1)
    expect(transaction.claimed()).toBe(false)
  })

  test('rolls back a stream failure before VM ownership and preserves claimed uploads', async () => {
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {})
    const failed = lifecycle()
    const failingApp = new Hono()
    failingApp.post('/ai', (c) =>
      streamChatRequest(c, {} as AIContext, [], failed.value, {
        saveReply: async () => {},
        streamAnswer: () => ({
          textStream: (async function* () {
            yield ''
            throw new Error('VM acquisition failed')
          })()
        })
      })
    )

    const failedResponse = await failingApp.request('/ai', { method: 'POST' })
    expect(await failedResponse.text()).toContain('{"type":"error"}')
    expect(failed.rollbacks()).toBe(1)

    const claimed = lifecycle()
    const successfulApp = new Hono()
    successfulApp.post('/ai', (c) =>
      streamChatRequest(c, {} as AIContext, [], claimed.value, {
        saveReply: async () => {},
        streamAnswer: () => {
          claimed.value.claim()
          return {
            textStream: (async function* () {
              yield '{"type":"stream_end"}\n'
            })()
          }
        }
      })
    )

    expect(await (await successfulApp.request('/ai', { method: 'POST' })).text()).toContain(
      'stream_end'
    )
    expect(claimed.claimed()).toBe(true)
    expect(claimed.rollbacks()).toBe(0)
    errorSpy.mockRestore()
  })
})
