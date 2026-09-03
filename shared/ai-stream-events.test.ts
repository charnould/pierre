import { describe, expect, test } from 'bun:test'

import { createAiStreamState, parseAiStreamLine, reduceAiStreamState } from './ai-stream-events'

describe('canonical AI stream parser', () => {
  test('parses structured events and the terminal event', () => {
    expect(parseAiStreamLine('{"type":"text_delta","contentIndex":0,"delta":"hello"}')).toEqual({
      type: 'text_delta',
      contentIndex: 0,
      delta: 'hello'
    })
    expect(parseAiStreamLine('{"type":"attachment_uploads_ready"}')).toEqual({
      type: 'attachment_uploads_ready'
    })
    expect(parseAiStreamLine('{"type":"attachment_uploads_ready","files":2,"bytes":1024}')).toEqual(
      {
        type: 'attachment_uploads_ready',
        files: 2,
        bytes: 1024
      }
    )
    expect(parseAiStreamLine('{"type":"stream_end"}')).toEqual({ type: 'stream_end' })
  })

  test('rejects removed wire events', () => {
    for (const type of ['delta', 'reasoning_delta', 'reset', 'done', 'intent']) {
      expect(parseAiStreamLine(JSON.stringify({ type, content: 'legacy' }))).toBeNull()
    }
  })

  test('requires the questionnaire response secret', () => {
    const request = {
      type: 'extension_ui_request' as const,
      requestId: 'request-1',
      toolCallId: 'call-1',
      method: 'input' as const,
      questions: [
        { question: 'Continue?', choices: ['Yes', 'No', 'Other'] as [string, string, string] }
      ]
    }
    expect(parseAiStreamLine(JSON.stringify(request))).toBeNull()
    expect(parseAiStreamLine(JSON.stringify({ ...request, responseSecret: 'secret' }))).toEqual({
      ...request,
      responseSecret: 'secret'
    })
  })

  test('requires an explicit tool execution outcome', () => {
    const event = {
      type: 'tool_execution_end' as const,
      toolCallId: 'call-1',
      toolName: 'read',
      result: 'done'
    }
    expect(parseAiStreamLine(JSON.stringify(event))).toBeNull()
    expect(parseAiStreamLine(JSON.stringify({ ...event, isError: false }))).toEqual({
      ...event,
      isError: false
    })
  })
})

describe('canonical AI stream reducer', () => {
  test('reduces indexed text and thinking and seals the stream', () => {
    const state = createAiStreamState()
    reduceAiStreamState(state, { type: 'thinking_delta', contentIndex: 0, delta: 'think' })
    reduceAiStreamState(state, { type: 'text_delta', contentIndex: 1, delta: 'answer' })
    reduceAiStreamState(state, { type: 'stream_end' })
    expect(state.thinking).toBe('think')
    expect(state.text).toBe('answer')
    expect([...state.contentByIndex.entries()]).toEqual([
      [0, { type: 'thinking', thinking: 'think' }],
      [1, { type: 'text', text: 'answer' }]
    ])
    expect(state.ended).toBe(true)
  })

  test('uses message_end as authoritative content after tools', () => {
    const state = createAiStreamState()
    reduceAiStreamState(state, { type: 'text_end', contentIndex: 0, content: 'preamble' })
    reduceAiStreamState(state, {
      type: 'toolcall_start',
      contentIndex: 1,
      toolCallId: 'call-1',
      toolName: 'read'
    })
    reduceAiStreamState(state, {
      type: 'message_end',
      message: { role: 'assistant', content: [{ type: 'text', text: 'final' }] }
    })
    expect(state.text).toBe('final')
    expect(state.toolCallsSeen).toBe(1)
  })
})
