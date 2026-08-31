import { describe, expect, test } from 'bun:test'

import { markdownToStreamHtml } from './markdown-stream-preview'

describe('markdownToStreamHtml', () => {
  test('wraps plain text in a paragraph', () => {
    expect(markdownToStreamHtml('Bonjour')).toBe('<p>Bonjour</p>')
  })

  test('renders bold and italic', () => {
    expect(markdownToStreamHtml('**gras**')).toBe('<p><strong>gras</strong></p>')
    expect(markdownToStreamHtml('*italique*')).toBe('<p><em>italique</em></p>')
    expect(markdownToStreamHtml('_italique_')).toBe('<p><em>italique</em></p>')
  })

  test('groups bullets into a single closed list', () => {
    expect(markdownToStreamHtml('- un\n- deux\nsuite')).toBe(
      '<ul><li>un</li><li>deux</li></ul><p>suite</p>'
    )
    expect(markdownToStreamHtml('- un')).toBe('<ul><li>un</li></ul>')
  })

  test('escapes an ampersand', () => {
    expect(markdownToStreamHtml('Dupont & Fils')).toBe('<p>Dupont &amp; Fils</p>')
  })

  test('returns an empty string for blank input', () => {
    expect(markdownToStreamHtml('')).toBe('')
    expect(markdownToStreamHtml('   \n\t\n  ')).toBe('')
  })

  describe('escapes injected markup', () => {
    const payloads: [name: string, input: string][] = [
      ['script tag', '<script>alert(1)</script>'],
      ['img onerror', '<img src=x onerror=alert(1)>'],
      ['javascript: href', '<a href="javascript:alert(1)">clic</a>'],
      ['javascript: src', '<iframe src="javascript:alert(1)"></iframe>'],
      ['svg script', '<svg><script>alert(1)</script></svg>'],
      ['foreignObject', '<svg><foreignObject><img src=x onerror=alert(1)></foreignObject></svg>'],
      ['svg event handler', '<svg onload=alert(1)><circle onclick=alert(1) r="9"/></svg>'],
      ['noscript mutation', '<noscript><p title="</noscript><img src=x onerror=alert(1)>">'],
      ['style tag', '<style>@import "//evil";</style>'],
      ['form action', '<form action="//evil"><input name="password"></form>']
    ]

    for (const [name, input] of payloads) {
      test(name, () => {
        const html = markdownToStreamHtml(input)
        expect(html).not.toMatch(/<(?!\/?(?:p|ul|li|strong|em)>)/)
        expect(html).toContain('&lt;')
      })
    }

    test('leaves the payload as visible text', () => {
      expect(markdownToStreamHtml('<script>alert(1)</script>')).toBe(
        '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'
      )
    })

    test('escapes markup inside a bullet and inside emphasis', () => {
      expect(markdownToStreamHtml('- <img src=x onerror=alert(1)>')).toBe(
        '<ul><li>&lt;img src=x onerror=alert(1)&gt;</li></ul>'
      )
      expect(markdownToStreamHtml('**<script>**')).toBe('<p><strong>&lt;script&gt;</strong></p>')
    })

    test('escapes the quote that would break out of an attribute', () => {
      expect(markdownToStreamHtml('a " b')).toBe('<p>a &quot; b</p>')
    })

    test('does not double-unescape a pre-escaped entity', () => {
      expect(markdownToStreamHtml('&lt;script&gt;')).toBe('<p>&amp;lt;script&amp;gt;</p>')
    })
  })
})
