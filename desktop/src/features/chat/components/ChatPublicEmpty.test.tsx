import { describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { ChatPublicEmpty } from './ChatPublicEmpty'

describe('ChatPublicEmpty', () => {
  test('renders examples as a divided list, not a greeting or bubbles', () => {
    const markup = renderToStaticMarkup(
      <ChatPublicEmpty examples={['Comment déposer mon préavis ?']} onExample={() => {}} />
    )
    expect(markup).toContain('Comment déposer mon préavis ?')
    expect(markup).toContain('Questions proposées')
    expect(markup).toContain('rounded-xl')
    expect(markup).not.toContain('shadow-sm')
    expect(markup).toContain('divide-y')
    expect(markup).toContain('type="button"')
    expect(markup).not.toContain('min-h-11')
    expect(markup).not.toContain('Bonjour')
    expect(markup).not.toContain('Exemples')
    expect(markup).not.toContain('pierre-display')
    expect(markup).not.toContain('typeset-reply')
    expect(markup).not.toContain('data-slot="bubble"')
    expect(markup).not.toContain('<img')
  })

  test('quiet examples drop the filleted box', () => {
    const markup = renderToStaticMarkup(
      <ChatPublicEmpty quiet examples={['Comment déposer mon préavis ?']} onExample={() => {}} />
    )
    expect(markup).toContain('Comment déposer mon préavis ?')
    expect(markup).toContain('Questions proposées')
    expect(markup).toContain('text-muted-foreground')
    expect(markup).not.toContain('rounded-xl')
    expect(markup).not.toContain('divide-y')
    expect(markup).not.toContain('bg-popover')
    expect(markup).not.toContain('shadow-sm')
  })

  test('renders nothing without examples', () => {
    const markup = renderToStaticMarkup(<ChatPublicEmpty examples={[]} onExample={() => {}} />)
    expect(markup).toBe('')
  })
})
