import { describe, expect, test } from 'bun:test'

import {
  applyWorkflowStreamEvent,
  createWorkflowStreamSession,
  isWorkflowReasoningPhase
} from './workflow-stream-buffers'

describe('applyWorkflowStreamEvent', () => {
  test('appends structured text to the stream buffer', () => {
    const session = createWorkflowStreamSession()
    applyWorkflowStreamEvent(session, { type: 'text_delta', contentIndex: 0, delta: 'Hi' }, true)
    applyWorkflowStreamEvent(
      session,
      { type: 'text_delta', contentIndex: 0, delta: ' there' },
      true
    )
    expect(session.text).toBe('Hi there')
  })

  test('appends structured thinking when capture enabled', () => {
    const session = createWorkflowStreamSession()
    applyWorkflowStreamEvent(
      session,
      { type: 'thinking_delta', contentIndex: 0, delta: 'think more' },
      true
    )
    expect(session.thinking).toBe('think more')
  })

  test('ignores structured thinking when capture disabled', () => {
    const session = createWorkflowStreamSession()
    applyWorkflowStreamEvent(
      session,
      { type: 'thinking_delta', contentIndex: 0, delta: 'hidden' },
      false
    )
    expect(session.thinking).toBe('')
  })

  test('tool start clears response text and increments counter', () => {
    const session = createWorkflowStreamSession()
    applyWorkflowStreamEvent(
      session,
      { type: 'text_end', contentIndex: 0, content: 'preamble' },
      true
    )
    applyWorkflowStreamEvent(
      session,
      { type: 'toolcall_start', contentIndex: 1, toolCallId: 'call-1', toolName: 'read' },
      true
    )
    expect(session.text).toBe('')
    expect(session.toolCallsSeen).toBe(1)
  })

  test('message_end supplies authoritative text', () => {
    const session = createWorkflowStreamSession()
    applyWorkflowStreamEvent(
      session,
      {
        type: 'message_end',
        message: { role: 'assistant', content: [{ type: 'text', text: 'final' }] }
      },
      true
    )
    expect(session.text).toBe('final')
  })
})

describe('isWorkflowReasoningPhase', () => {
  const base = {
    isStreaming: true,
    captureReasoning: true,
    resetsSeen: 0,
    hadReasoningDelta: true
  }

  test('stays in reasoning phase while streaming with no output', () => {
    expect(isWorkflowReasoningPhase({ ...base, hasOutput: false })).toBe(true)
  })

  test('stays in reasoning phase for pre-reset preamble delta when reasoning was captured', () => {
    expect(isWorkflowReasoningPhase({ ...base, hasOutput: true, resetsSeen: 0 })).toBe(true)
  })

  test('leaves reasoning phase after reset when response output arrives', () => {
    expect(
      isWorkflowReasoningPhase({ ...base, hasOutput: true, resetsSeen: 1, hadReasoningDelta: true })
    ).toBe(false)
  })

  test('leaves reasoning phase immediately when reasoning capture is off', () => {
    expect(
      isWorkflowReasoningPhase({
        ...base,
        hasOutput: true,
        captureReasoning: false
      })
    ).toBe(false)
  })

  test('leaves reasoning phase for direct response without reasoning deltas', () => {
    expect(
      isWorkflowReasoningPhase({
        ...base,
        hasOutput: true,
        hadReasoningDelta: false,
        resetsSeen: 0
      })
    ).toBe(false)
  })

  test('ends when stream completes', () => {
    expect(
      isWorkflowReasoningPhase({
        ...base,
        isStreaming: false,
        hasOutput: true
      })
    ).toBe(false)
  })
})
