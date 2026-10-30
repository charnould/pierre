import { describe, expect, it } from 'bun:test'

import type { AIContext } from '../../../utils/_schema'
import { streamChatAnswer } from '../../../utils/stream-chat'

const context = {
  conv_id: '0198f1a0-7b6c-7000-8000-000000000001',
  config: {
    id: 'default',
    display: 'Pierre',
    community_knowledge: false,
    trace: 'none',
    attachments: false
  },
  role: 'user',
  content: 'Bonjour',
  user_email: null,
  query: null,
  chunks: { community: [], proprietary: [] },
  custom_data: { raw: [''], transformed: '' },
  conversation: []
} as AIContext

async function collect(answer: ReturnType<typeof streamChatAnswer>) {
  const lines: string[] = []
  for await (const line of answer.textStream) if (line) lines.push(line)
  return lines
}

describe('streamChatAnswer', () => {
  it('persists the final reply after a completed stream', async () => {
    let saved = ''
    const lines = await collect(
      streamChatAnswer(context, undefined, undefined, undefined, {
        streamCopilot: async function* () {
          yield { type: 'done', fullContent: 'Réponse' }
        },
        saveReply: async (savedContext) => {
          saved = savedContext.content
        },
        sendTelemetry: () => {}
      })
    )
    expect(saved).toBe('Réponse')
    expect(lines.some((line) => line.includes('"stream_end"'))).toBe(true)
  })

  it('rolls attachments back and emits an error when the stream fails', async () => {
    let rolledBack = false
    const lines = await collect(
      streamChatAnswer(
        context,
        undefined,
        undefined,
        {
          claim() {},
          async rollback() {
            rolledBack = true
          }
        },
        {
          streamCopilot: async function* () {
            yield { type: 'thinking_delta', contentIndex: 0, delta: '…' }
            throw new Error('modèle indisponible')
          },
          saveReply: async () => {
            throw new Error('should not save')
          },
          sendTelemetry: () => {}
        }
      )
    )
    expect(rolledBack).toBe(true)
    expect(lines.at(-1)).toContain('"type":"error"')
  })
})
