import { describe, expect, test } from 'bun:test'

import { applyAgentWorkStreamEvent, createAgentWorkStreamState } from './agent-work-stream'

describe('agent work stream', () => {
  test('keeps reasoning and tool execution details in chronological order', () => {
    const state = createAgentWorkStreamState()
    applyAgentWorkStreamEvent(
      state,
      { type: 'thinking_delta', contentIndex: 0, delta: 'Je cherche.' },
      true
    )
    applyAgentWorkStreamEvent(
      state,
      { type: 'toolcall_start', contentIndex: 1, toolCallId: 'call-1', toolName: 'sqlite3' },
      true
    )
    applyAgentWorkStreamEvent(
      state,
      {
        type: 'tool_execution_end',
        toolCallId: 'call-1',
        toolName: 'sqlite3',
        result: '1 ligne',
        isError: false
      },
      true
    )

    expect(state.parts).toEqual([
      { type: 'thinking', contentIndex: 0, thinking: 'Je cherche.' },
      {
        type: 'tool',
        contentIndex: 1,
        toolCallId: 'call-1',
        name: 'sqlite3',
        status: 'success',
        output: '1 ligne'
      }
    ])
  })

  test('hides reasoning but keeps tools when capture is disabled', () => {
    const state = createAgentWorkStreamState()
    applyAgentWorkStreamEvent(
      state,
      { type: 'thinking_delta', contentIndex: 0, delta: 'Privé' },
      false
    )
    applyAgentWorkStreamEvent(
      state,
      { type: 'toolcall_start', contentIndex: 1, toolCallId: 'call-1', toolName: 'read' },
      false
    )

    expect(state.parts).toHaveLength(1)
    expect(state.parts[0]).toMatchObject({ type: 'tool', name: 'read' })

    applyAgentWorkStreamEvent(
      state,
      {
        type: 'message_end',
        message: {
          role: 'assistant',
          content: [
            { type: 'thinking', thinking: 'Toujours privé' },
            { type: 'toolCall', id: 'call-1', name: 'read', arguments: {} }
          ]
        }
      },
      false
    )
    expect(state.parts).toHaveLength(1)
    expect(state.parts[0]).toMatchObject({ type: 'tool', name: 'read' })
  })

  test('preserves completed work when the final text starts a new segment', () => {
    const state = createAgentWorkStreamState()
    applyAgentWorkStreamEvent(
      state,
      {
        type: 'message_end',
        message: {
          role: 'assistant',
          content: [{ type: 'thinking', thinking: 'Analyse terminée.' }]
        }
      },
      true
    )
    applyAgentWorkStreamEvent(state, { type: 'text_start', contentIndex: 0 }, true)
    applyAgentWorkStreamEvent(
      state,
      {
        type: 'message_end',
        message: { role: 'assistant', content: [{ type: 'text', text: 'Réponse.' }] }
      },
      true
    )

    expect(state.parts).toEqual([
      { type: 'thinking', contentIndex: 0, thinking: 'Analyse terminée.' }
    ])
  })
})
