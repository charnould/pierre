import { describe, expect, test } from 'bun:test'

import { resolveAssistantPhase } from '@/features/chat/lib/chat-assistant-phase'

describe('resolveAssistantPhase', () => {
  test('pending when last assistant is empty and streaming', () => {
    expect(resolveAssistantPhase(true, 'streaming', false)).toBe('pending')
    expect(resolveAssistantPhase(true, 'submitted', false)).toBe('pending')
  })

  test('complete while a message with content is streaming', () => {
    expect(resolveAssistantPhase(true, 'streaming', true)).toBe('complete')
  })

  test('complete when not the last message', () => {
    expect(resolveAssistantPhase(false, 'streaming', false)).toBe('complete')
  })

  test('stopped and error take priority over pending', () => {
    expect(resolveAssistantPhase(true, 'stopped', false)).toBe('stopped')
    expect(resolveAssistantPhase(true, 'error', false)).toBe('error')
    expect(resolveAssistantPhase(true, 'stopped', true)).toBe('stopped')
    expect(resolveAssistantPhase(true, 'error', true)).toBe('error')
  })
})
