import { describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { ChatPanel } from '@/features/chat/ChatPanel'
import type { ChatTransport } from '@/features/chat/lib/chat-transport'
import type { ChatBoot } from '@/shared/types'

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

const transport: ChatTransport = {
  stream: async () => {},
  submitQuestionnaire: async () => true
}

describe('ChatPanel attachments', () => {
  test('omits the paperclip when attachments are disabled', () => {
    const markup = renderToStaticMarkup(<ChatPanel boot={boot} transport={transport} />)
    expect(markup).not.toContain('Joindre un fichier')
    expect(markup).not.toContain('Déposer pour joindre')
    expect(markup).not.toContain('data-slot="chat-empty-greeting"')
  })

  test('empty lists examples in the dock, not the thread', () => {
    const greetings = ['Bonjour 👋', 'Bonsoir 😌']
    const markup = renderToStaticMarkup(
      <ChatPanel
        boot={{ ...boot, greetings, examples: ['Comment déposer mon préavis ?'] }}
        transport={transport}
      />
    )
    expect(markup).toContain('Comment déposer mon préavis ?')
    expect(markup).toContain('Questions proposées')
    expect(markup).toContain('rounded-xl')
    expect(markup).toContain('data-slot="chat-empty-greeting"')
    expect(greetings.some((line) => markup.includes(line))).toBe(true)
    expect(markup).toContain('font-serif')
    expect(markup).toContain('px-3')
    expect(markup.indexOf('data-slot="chat-empty-greeting"')).toBeLessThan(
      markup.indexOf('data-slot="input-group"')
    )
    expect(markup.indexOf('data-slot="input-group"')).toBeLessThan(
      markup.indexOf('Questions proposées')
    )
    expect(markup).not.toContain('Exemples')
    expect(markup).not.toContain('<img')
    expect(markup).not.toContain('typeset-reply')
    expect(markup).not.toMatch(/lucide-(hand|bot|rocket|handshake)/)
  })

  test('arrival greeting shows a Lucide mark and strips the trailing emoji', () => {
    const markup = renderToStaticMarkup(
      <ChatPanel arrival boot={{ ...boot, greetings: ['Bonjour ! 👋'] }} transport={transport} />
    )
    expect(markup).toContain('data-slot="chat-empty-greeting"')
    expect(markup).toContain('lucide-hand')
    expect(markup).toContain('Bonjour !')
    expect(markup).toContain('text-4xl')
    expect(markup).toContain('items-start')
    expect(markup).toContain('mt-1 size-8')
    expect(markup).not.toContain('👋')
    expect(markup).not.toContain('Bonjour ! 👋')
    expect(markup).not.toContain('text-3xl')
  })

  test('arrival embed keeps text-2xl with the mark', () => {
    const markup = renderToStaticMarkup(
      <ChatPanel
        arrival
        boot={{ ...boot, greetings: ['Bonjour ! 👋'], embed: true }}
        transport={transport}
      />
    )
    expect(markup).toContain('lucide-hand')
    expect(markup).toContain('text-2xl')
    expect(markup).toContain('items-start')
    expect(markup).toContain('mt-0.5 size-6')
    expect(markup).not.toContain('text-4xl')
    expect(markup).not.toContain('text-3xl')
    expect(markup).not.toContain('👋')
  })

  test('arrival examples are a quiet list, not a filleted box', () => {
    const markup = renderToStaticMarkup(
      <ChatPanel
        arrival
        boot={{ ...boot, examples: ['Comment déposer mon préavis ?'] }}
        transport={transport}
      />
    )
    expect(markup).toContain('Questions proposées')
    expect(markup).toContain('Comment déposer mon préavis ?')
    expect(markup).not.toContain('divide-y')
    expect(markup).not.toContain('bg-popover')
    expect(markup).toContain('Comment puis-je vous aider aujourd&#x27;hui ?')
    expect(markup).not.toContain('data-example-preview')
  })

  test('empty hides the disclaimer until the thread starts', () => {
    const markup = renderToStaticMarkup(
      <ChatPanel boot={{ ...boot, disclaimer: 'Une IA peut se tromper.' }} transport={transport} />
    )
    expect(markup).not.toContain('Une IA peut se tromper.')
    expect(markup).not.toContain('data-slot="chat-disclaimer"')
  })

  test('autofocuses the composer except in embed', () => {
    const page = renderToStaticMarkup(<ChatPanel boot={boot} transport={transport} />)
    const embed = renderToStaticMarkup(
      <ChatPanel boot={{ ...boot, embed: true }} transport={transport} />
    )
    expect(page).toContain('autofocus')
    expect(embed).not.toContain('autofocus')
  })

  test('empty centers the invitation without a disclaimer foot', () => {
    const markup = renderToStaticMarkup(
      <ChatPanel
        boot={{
          ...boot,
          greetings: ['Bonjour 👋'],
          examples: ['Comment déposer mon préavis ?'],
          disclaimer: 'Une IA peut se tromper.'
        }}
        transport={transport}
      />
    )
    expect(markup).toContain('data-slot="chat-empty-stage"')
    expect(markup).toContain('data-slot="chat-empty-rise"')
    expect(markup).toContain('data-slot="chat-empty-fall"')
    expect(markup).toContain('data-slot="chat-invitation"')
    expect(markup.indexOf('data-slot="chat-empty-rise"')).toBeLessThan(
      markup.indexOf('data-slot="chat-empty-greeting"')
    )
    expect(markup.indexOf('Questions proposées')).toBeLessThan(
      markup.indexOf('data-slot="chat-empty-fall"')
    )
    expect(markup).not.toContain('data-slot="chat-disclaimer"')
    expect(markup).not.toContain('data-slot="message-scroller"')
  })

  test('window empty fills the viewport without a fixed dock or inner scrollbar', () => {
    const markup = renderToStaticMarkup(
      <ChatPanel boot={boot} transport={transport} scroll="window" />
    )
    expect(markup).toContain('min-h-dvh')
    expect(markup).toContain('data-slot="chat-empty-stage"')
    expect(markup).not.toContain('fixed')
    expect(markup).not.toContain('data-slot="message-scroller"')
    expect(markup).not.toContain('overflow-y-auto')
    expect(markup).not.toContain('min-h-svh')
    expect(markup).not.toContain('sticky')
    expect(markup).not.toContain('scrollbar-thin')
  })
})
