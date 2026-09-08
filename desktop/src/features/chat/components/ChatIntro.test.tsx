import { describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import type { ChatBoot } from '@/shared/types'

import { ChatIntro } from './ChatIntro'

const boot: ChatBoot = {
  convId: '00000000-0000-4000-8000-000000000000',
  configId: 'default',
  dataParam: '',
  disclaimer: 'Une IA peut se tromper.',
  greeting: ['Bonjour 🖐️,', 'Je suis PIERRE.'],
  examples: ['Comment déposer mon préavis ?'],
  displayableConfigs: [],
  trace: 'none',
  attachments: true
}

describe('ChatIntro', () => {
  test('keeps the icon and greeting when examples are hidden', () => {
    const markup = renderToStaticMarkup(
      <ChatIntro
        boot={boot}
        iconSrc="/branding/system.svg"
        showExamples={false}
        onExample={() => {}}
      />
    )
    expect(markup).toContain('/branding/system.svg')
    expect(markup).toContain('Bonjour 🖐️,')
    expect(markup).toContain('Je suis PIERRE.')
    expect(markup).toContain('typeset-reply')
    expect(markup).not.toContain('Comment déposer mon préavis ?')
  })

  test('renders examples only before the first message', () => {
    const markup = renderToStaticMarkup(
      <ChatIntro boot={boot} iconSrc="/branding/system.svg" showExamples onExample={() => {}} />
    )
    expect(markup).toContain('Comment déposer mon préavis ?')
    expect(markup).toContain('data-align="end"')
    expect(markup).toContain('data-variant="muted"')
  })
})
