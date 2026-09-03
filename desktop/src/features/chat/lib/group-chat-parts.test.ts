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

  test('hides retrieval chatter that precedes the last tool', () => {
    const tool = { type: 'tool', contentIndex: 1, status: 'running', name: 'search' } as const
    const after = { type: 'text', contentIndex: 2, text: 'After' } as const
    const parts: ChatMessagePart[] = [
      { type: 'text', contentIndex: 0, text: "Doc rowid 64. Let's read it." },
      tool,
      after
    ]

    expect(groupChatParts(parts)).toEqual([
      { type: 'work', parts: [tool] },
      { type: 'text', part: after }
    ])
  })
})
