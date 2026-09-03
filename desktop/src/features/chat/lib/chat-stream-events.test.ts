import { describe, expect, test } from 'bun:test'

import type { Message } from '@/features/chat/lib/chat-session-types'
import { applyChatStreamEvent, sealReasoningDuration } from '@/features/chat/lib/chat-stream-events'

function assistantMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'a1',
    role: 'assistant',
    parts: [],
    ...overrides
  }
}

describe('applyChatStreamEvent', () => {
  test('message_end authoritatively replaces the current assistant segment', () => {
    const messages: Message[] = [
      assistantMessage({
        parts: [{ type: 'text', contentIndex: 0, text: 'Réponse partielle' }]
      })
    ]
    const result = applyChatStreamEvent(
      messages,
      {
        type: 'message_end',
        message: {
          role: 'assistant',
          content: [
            { type: 'thinking', thinking: 'Terminé' },
            { type: 'text', text: 'Réponse finale' }
          ]
        }
      },
      null
    )

    expect(result.messages[0]?.parts).toEqual([
      { type: 'thinking', contentIndex: 0, thinking: 'Terminé' },
      { type: 'text', contentIndex: 1, text: 'Réponse finale' }
    ])
    expect(result.messages[0]?.segmentFinalized).toBe(true)
  })

  test('tool execution updates replace partial output and completion replaces it again', () => {
    const messages: Message[] = [assistantMessage()]
    const first = applyChatStreamEvent(
      messages,
      {
        type: 'tool_execution_update',
        toolCallId: 'call-1',
        toolName: 'bash',
        args: { command: 'pwd' },
        partialResult: 'first'
      },
      null
    )
    const second = applyChatStreamEvent(
      first.messages,
      {
        type: 'tool_execution_update',
        toolCallId: 'call-1',
        toolName: 'bash',
        args: { command: 'pwd' },
        partialResult: 'replacement'
      },
      null
    )
    const complete = applyChatStreamEvent(
      second.messages,
      {
        type: 'tool_execution_end',
        toolCallId: 'call-1',
        toolName: 'bash',
        result: 'final',
        isError: false
      },
      null
    )

    expect(complete.messages[0]?.parts).toEqual([
      {
        type: 'tool',
        contentIndex: 0,
        toolCallId: 'call-1',
        name: 'bash',
        arguments: { command: 'pwd' },
        status: 'success',
        output: 'final'
      }
    ])
  })

  test('shows a tool identity as soon as its call starts', () => {
    const result = applyChatStreamEvent(
      [assistantMessage()],
      {
        type: 'toolcall_start',
        contentIndex: 0,
        toolCallId: 'call-1',
        toolName: 'read'
      },
      null
    )

    expect(result.messages[0]?.parts).toEqual([
      {
        type: 'tool',
        contentIndex: 0,
        toolCallId: 'call-1',
        name: 'read',
        status: 'input-streaming'
      }
    ])
  })

  test('stream_end leaves authoritative message content unchanged', () => {
    const messages = [
      assistantMessage({ parts: [{ type: 'text', contentIndex: 0, text: 'authoritative' }] })
    ]
    const result = applyChatStreamEvent(messages, { type: 'stream_end' }, null)
    expect(result.messages).toEqual(messages)
  })

  test('attachment acknowledgment leaves visible message content unchanged', () => {
    const messages = [
      assistantMessage({ parts: [{ type: 'text', contentIndex: 0, text: 'answer' }] })
    ]
    const result = applyChatStreamEvent(messages, { type: 'attachment_uploads_ready' }, null)

    expect(result.messages).toEqual(messages)
  })
})

describe('sealReasoningDuration', () => {
  test('seals duration once', () => {
    const messages: Message[] = [
      assistantMessage({
        parts: [{ type: 'thinking', contentIndex: 0, thinking: 'x' }]
      })
    ]
    const start = Date.now() - 5000
    const sealed = sealReasoningDuration(messages, start, start + 3000, false)
    expect(sealed[0]?.reasoningDuration).toBe(3)
    expect(sealed[0]?.segmentFinalized).toBe(true)
  })

  test('does not seal when already sealed', () => {
    const messages: Message[] = [assistantMessage({ reasoningDuration: 2 })]
    const sealed = sealReasoningDuration(messages, 0, 1000, true)
    expect(sealed).toEqual(messages)
  })
})
