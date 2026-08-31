import { beforeAll, describe, expect, it } from 'bun:test'

import { JSDOM } from 'jsdom'

import { parseProseMarkdown, renderProseMarkdownHtml } from './parse-prose-markdown'

const TABLE_MD = `| A | B |
|---|---|
| 1 | 2 |
`

beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  globalThis.document = dom.window.document
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.HTMLElement = dom.window.HTMLElement
})

describe('parseProseMarkdown', () => {
  it('renders semantic html without streamdown wrappers', () => {
    const html = renderProseMarkdownHtml(`# Titre

Paragraphe **gras**.

- item un
- item deux

${TABLE_MD}`)
    expect(html).toContain('<h1>Titre</h1>')
    expect(html).toContain('<strong>gras</strong>')
    expect(html).toContain('<ul>')
    expect(html).toContain('<table>')
    expect(html).not.toContain('data-streamdown')
  })

  it('wraps gfm tables in typeset-scroll', () => {
    const html = renderProseMarkdownHtml(TABLE_MD)
    expect(html).toContain('class="typeset-scroll"')
    expect(html).toContain('<thead>')
    expect(html).toContain('<th>')
    expect(html).toContain('<td>')
  })

  it('keeps typeset-scroll class after sanitize', () => {
    const html = parseProseMarkdown(TABLE_MD)
    expect(html).toContain('class="typeset-scroll"')
    expect(html).toContain('<table>')
  })

  it('optionally turns single newlines into br', () => {
    const withBreaks = parseProseMarkdown('ligne un\nligne deux', { breaks: true })
    expect(withBreaks).toContain('<br>')
    const withoutBreaks = parseProseMarkdown('ligne un\nligne deux')
    expect(withoutBreaks).not.toContain('<br>')
  })

  it('adds external link attributes', () => {
    const html = parseProseMarkdown('[docs](https://example.com)')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it('strips unsafe html via dompurify', () => {
    const html = parseProseMarkdown('<img src=x onerror=alert(1)>')
    expect(html).not.toContain('onerror')
    expect(html).not.toContain('<script')
  })
})
