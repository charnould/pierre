import { describe, expect, test } from 'bun:test'

import type { ChatMessagePart } from '@/features/chat/lib/chat-session-types'
import { groupChatParts } from '@/features/chat/lib/group-chat-parts'

describe('groupChatParts', () => {
  test('groups contiguous thinking and tool parts without changing their order', () => {
    const firstThought = { type: 'thinking', contentIndex: 0, thinking: 'First thought' } as const
    const tool = {
      type: 'tool',
      contentIndex: 1,
      status: 'success',
      name: 'search'
    } as const
    const secondThought = { type: 'thinking', contentIndex: 2, thinking: 'Second thought' } as const
    const answer = { type: 'text', contentIndex: 3, text: 'Answer' } as const
    const parts: ChatMessagePart[] = [firstThought, tool, secondThought, answer]

    expect(groupChatParts(parts)).toEqual([
      { type: 'work', parts: [firstThought, tool, secondThought] },
      { type: 'text', part: answer }
    ])
  })

  test('starts a new work group after answer text', () => {
    const parts: ChatMessagePart[] = [
      { type: 'text', contentIndex: 0, text: 'Before' },
      { type: 'tool', contentIndex: 1, status: 'running', name: 'search' },
      { type: 'text', contentIndex: 2, text: 'After' }
    ]

    expect(groupChatParts(parts).map((group) => group.type)).toEqual(['text', 'work', 'text'])
  })
})
