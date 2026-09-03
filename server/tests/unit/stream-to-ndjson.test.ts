import { describe, expect, test } from 'bun:test'

import { parseAskUserMarker, piEventToCopilotChunks } from '../../utils/copilot-agent'
import { copilotChunkToNdjson, ndjsonLine } from '../../utils/stream-to-ndjson'

describe('copilotChunkToNdjson', () => {
  test('maps internal done to the canonical terminal event', () => {
    expect([
      ...copilotChunkToNdjson(
        { type: 'done', fullContent: 'final', inputTokens: 1, outputTokens: 2 },
        'off'
      )
    ]).toEqual([{ type: 'stream_end' }])
  })

  test('filters structured thinking when off', () => {
    expect([
      ...copilotChunkToNdjson({ type: 'thinking_delta', contentIndex: 0, delta: 'private' }, 'off')
    ]).toEqual([])
    expect([
      ...copilotChunkToNdjson(
        {
          type: 'message_end',
          message: {
            role: 'assistant',
            content: [
              { type: 'thinking', thinking: 'private' },
              { type: 'text', text: 'public' }
            ]
          }
        },
        'off'
      )
    ]).toEqual([
      {
        type: 'message_end',
        message: { role: 'assistant', content: [{ type: 'text', text: 'public' }] }
      }
    ])
  })

  test('ndjsonLine appends newline', () => {
    expect(ndjsonLine({ type: 'error' })).toBe('{"type":"error"}\n')
  })

  test('maps Pi text and thinking without legacy duplicate output', () => {
    expect(
      piEventToCopilotChunks({
        type: 'message_update',
        message: { cumulative: 'not forwarded' },
        assistantMessageEvent: {
          type: 'text_delta',
          contentIndex: 2,
          delta: 'hello',
          partial: { cumulative: 'not forwarded' }
        }
      })
    ).toEqual([{ type: 'text_delta', contentIndex: 2, delta: 'hello' }])

    expect(
      piEventToCopilotChunks({
        type: 'message_update',
        assistantMessageEvent: {
          type: 'thinking_delta',
          contentIndex: 0,
          delta: 'considering'
        }
      })
    ).toEqual([{ type: 'thinking_delta', contentIndex: 0, delta: 'considering' }])
  })

  test('preserves tool call and execution correlation without markdown flattening', () => {
    expect(
      piEventToCopilotChunks({
        type: 'message_update',
        assistantMessageEvent: {
          type: 'toolcall_start',
          contentIndex: 1,
          id: 'call-1',
          toolName: 'read'
        }
      })
    ).toEqual([
      {
        type: 'toolcall_start',
        contentIndex: 1,
        toolCallId: 'call-1',
        toolName: 'read'
      }
    ])

    expect(
      piEventToCopilotChunks({
        type: 'tool_execution_update',
        toolCallId: 'call-1',
        toolName: 'bash',
        args: { command: 'pwd' },
        partialResult: { content: [{ type: 'text', text: '/knowledge' }] }
      })
    ).toEqual([
      {
        type: 'tool_execution_update',
        toolCallId: 'call-1',
        toolName: 'bash',
        args: { command: 'pwd' },
        partialResult: { content: [{ type: 'text', text: '/knowledge' }] }
      }
    ])

    expect(
      piEventToCopilotChunks({
        type: 'tool_execution_end',
        toolCallId: 'call-1',
        toolName: 'bash',
        result: { content: [{ type: 'text', text: '/knowledge' }] },
        isError: false
      })
    ).toEqual([
      {
        type: 'tool_execution_end',
        toolCallId: 'call-1',
        toolName: 'bash',
        result: { content: [{ type: 'text', text: '/knowledge' }] },
        isError: false
      }
    ])
  })

  test('forwards message_end as the authoritative message', () => {
    const message = {
      role: 'assistant' as const,
      content: [{ type: 'text' as const, text: 'final answer' }],
      stopReason: 'stop' as const
    }
    expect(piEventToCopilotChunks({ type: 'message_end', message })).toEqual([
      { type: 'message_end', message }
    ])
    expect(
      piEventToCopilotChunks({
        type: 'message_end',
        message: { role: 'user', content: [{ type: 'text', text: 'prompt' }] }
      })
    ).toEqual([])
  })

  test('accepts only the exact ask_user correlation marker', () => {
    expect(parseAskUserMarker('pierre:ask_user:{"toolCallId":"call-42"}')).toBe('call-42')
    expect(parseAskUserMarker('pierre:ask_user:not-json')).toBeNull()
    expect(parseAskUserMarker('unrelated')).toBeNull()
  })
})
