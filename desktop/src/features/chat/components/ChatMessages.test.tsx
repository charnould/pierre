import { describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import type { Message } from '@/features/chat/lib/chat-session-types'
import type { ChatBoot } from '@/shared/types'

import { ChatMessages } from './ChatMessages'

const boot: ChatBoot = {
  convId: '00000000-0000-4000-8000-000000000000',
  configId: 'default',
  dataParam: '',
  greetings: [],
  disclaimer: null,
  examples: [],
  displayableConfigs: [],
  trace: 'none',
  attachments: false
}

const messages: Message[] = [
  {
    id: 'user-1',
    role: 'user',
    parts: [{ type: 'text', contentIndex: 0, text: 'Comment déposer mon préavis ?' }]
  }
]

describe('ChatMessages', () => {
  test('renders rows without MessageScroller when scroller is off', () => {
    const markup = renderToStaticMarkup(
      <ChatMessages
        messages={messages}
        status="ready"
        boot={boot}
        onRegenerate={() => {}}
        scroller={false}
      />
    )
    expect(markup).toContain('Comment déposer mon préavis ?')
    expect(markup).not.toContain('data-slot="message-scroller-item"')
  })

  test('keeps Réflexion when thinking has started without text', () => {
    const markup = renderToStaticMarkup(
      <ChatMessages
        messages={[
          ...messages,
          {
            id: 'assistant-1',
            role: 'assistant',
            parts: [{ type: 'thinking', contentIndex: 0, thinking: '' }]
          }
        ]}
        status="streaming"
        boot={{ ...boot, trace: 'expanded' }}
        onRegenerate={() => {}}
        scroller={false}
      />
    )
    expect(markup).toContain('Réflexion')
    expect(markup).toContain('animate-spin')
  })

  test('shows Réflexion for an empty streaming assistant', () => {
    const markup = renderToStaticMarkup(
      <ChatMessages
        messages={[...messages, { id: 'assistant-1', role: 'assistant', parts: [] }]}
        status="submitted"
        boot={boot}
        onRegenerate={() => {}}
        scroller={false}
      />
    )
    expect(markup).toContain('Réflexion')
    expect(markup).toContain('animate-spin')
  })

  test('hides an empty assistant once the turn is idle', () => {
    const markup = renderToStaticMarkup(
      <ChatMessages
        messages={[...messages, { id: 'assistant-1', role: 'assistant', parts: [] }]}
        status="ready"
        boot={boot}
        onRegenerate={() => {}}
        scroller={false}
      />
    )
    expect(markup).not.toContain('Réflexion')
  })
})
