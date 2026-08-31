import { describe, expect, test } from 'bun:test'

import { parseAiStreamLine } from './parse-workflow-chunk'
import type { AiStreamEvent } from './parse-workflow-chunk'

describe('parseAiStreamLine', () => {
  test('rejects every removed legacy event', () => {
    for (const line of [
      '{"type":"delta","content":"hi"}',
      '{"type":"reasoning_delta","content":"think"}',
      '{"type":"done","content":"final"}',
      '{"type":"reset"}'
    ]) {
      expect(parseAiStreamLine(line)).toBeNull()
    }
  })

  test('returns null for empty line', () => {
    expect(parseAiStreamLine('   ')).toBeNull()
  })

  test('rejects unknown event types', () => {
    expect(parseAiStreamLine('{"type":"unknown","content":"x"}')).toBeNull()
  })

  test('does not infer errors from non-JSON legacy output', () => {
    expect(parseAiStreamLine('not json but pierre_error occurred')).toBeNull()
  })

  test('parses structured text and thinking deltas', () => {
    expect(
      parseAiStreamLine(JSON.stringify({ type: 'text_delta', contentIndex: 2, delta: 'hello' }))
    ).toEqual({ type: 'text_delta', contentIndex: 2, delta: 'hello' })
    expect(
      parseAiStreamLine(JSON.stringify({ type: 'thinking_delta', contentIndex: 1, delta: 'hmm' }))
    ).toEqual({ type: 'thinking_delta', contentIndex: 1, delta: 'hmm' })
    expect(
      parseAiStreamLine(
        JSON.stringify({
          type: 'toolcall_start',
          contentIndex: 3,
          toolCallId: 'call-1',
          toolName: 'read'
        })
      )
    ).toEqual({
      type: 'toolcall_start',
      contentIndex: 3,
      toolCallId: 'call-1',
      toolName: 'read'
    })
  })

  test('parses authoritative message_end content', () => {
    const event: AiStreamEvent = {
      type: 'message_end',
      message: {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'done' },
          { type: 'text', text: 'answer' },
          {
            type: 'toolCall',
            id: 'call-1',
            name: 'bash',
            arguments: { command: 'pwd' }
          }
        ]
      }
    }
    expect(parseAiStreamLine(JSON.stringify(event))).toEqual(event)
    expect(
      parseAiStreamLine(
        JSON.stringify({
          type: 'message_end',
          message: { role: 'user', content: [{ type: 'text', text: 'not authoritative' }] }
        })
      )
    ).toBeNull()
  })

  test('parses extension UI requests and rejects malformed questions', () => {
    const valid: AiStreamEvent = {
      type: 'extension_ui_request',
      requestId: 'request-1',
      toolCallId: 'call-1',
      responseSecret: 'secret',
      method: 'input',
      questions: [{ question: 'Continue?', choices: ['Yes', 'No', 'Other'] }]
    }
    expect(parseAiStreamLine(JSON.stringify(valid))).toEqual(valid)
    expect(
      parseAiStreamLine(
        JSON.stringify({
          ...valid,
          questions: [{ question: 'Continue?', choices: [] }]
        })
      )
    ).toBeNull()
  })

  test('parses tool execution updates as replacement payloads', () => {
    const event: AiStreamEvent = {
      type: 'tool_execution_update',
      toolCallId: 'call-1',
      toolName: 'bash',
      args: { command: 'pwd' },
      partialResult: { output: '/tmp' }
    }
    expect(parseAiStreamLine(JSON.stringify(event))).toEqual(event)
  })
})
