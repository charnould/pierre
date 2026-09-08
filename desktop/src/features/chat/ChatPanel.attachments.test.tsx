import { describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { ChatPanel } from '@/features/chat/ChatPanel'
import type { ChatTransport } from '@/features/chat/lib/chat-transport'
import type { ChatBoot } from '@/shared/types'

const boot: ChatBoot = {
  convId: '00000000-0000-4000-8000-000000000000',
  configId: 'default',
  dataParam: '',
  disclaimer: null,
  greeting: [],
  examples: [],
  displayableConfigs: [],
  trace: 'none',
  attachments: false
}

const transport: ChatTransport = {
  stream: async () => {},
  submitQuestionnaire: async () => true
}

describe('ChatPanel attachments', () => {
  test('omits the drop overlay when attachments are disabled', () => {
    const markup = renderToStaticMarkup(<ChatPanel boot={boot} transport={transport} />)
    expect(markup).not.toContain('Déposer pour joindre')
  })

  test('window scroll does not create an inner chat scrollbar', () => {
    const markup = renderToStaticMarkup(
      <ChatPanel boot={boot} transport={transport} scroll="window" />
    )
    expect(markup).toContain('overflow-visible')
    expect(markup).toContain('fixed')
    expect(markup).not.toContain('sticky')
    expect(markup).not.toContain('scrollbar-thin')
  })
})
