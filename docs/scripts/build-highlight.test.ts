import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'

import { escapeUnknownTags, highlightFences, rewriteUnpublishedLinks } from './build.ts'

const DOCS = join(import.meta.dir, '..')

function fence(lang: string, code: string) {
  return highlightFences(Bun.markdown.html(`\`\`\`${lang}\n${code}\n\`\`\``))
}

describe('escapeUnknownTags', () => {
  it('turns prompt tags into text', () => {
    const html = Bun.markdown.html(escapeUnknownTags('Dans <session>.\n\n<schema-content>\n\nfin'))
    expect(html).toContain('&lt;session&gt;')
    expect(html).toContain('&lt;schema-content&gt;')
    expect(html).not.toContain('<session>')
    expect(html).not.toContain('<schema-content>')
    expect(html).not.toContain('&amp;lt;')
  })

  it('keeps documentation html and a session tag inside a code fence', () => {
    const source = '<div><p>ok</p></div>\n\n```markdown\n<session>date</session>\n```'
    const escaped = escapeUnknownTags(source)
    expect(escaped).toContain('<div><p>ok</p></div>')
    expect(escaped).toContain('<session>date</session>')
    expect(escaped).not.toContain('\\<')
  })
})

describe('highlightFences', () => {
  it('highlights json and escapes raw markup', () => {
    const html = fence('json', '{ "a": "<" }')
    expect(html).toContain('<pre class="language-json">')
    expect(html).toContain('class="token string"')
    expect(html).toContain('&lt;')
    expect(html).not.toContain('"<"')
  })

  it('highlights yaml and bash', () => {
    expect(fence('yaml', 'key: value')).toContain('class="token')
    expect(fence('bash', 'echo hi')).toContain('class="token')
  })
})

describe('rewriteUnpublishedLinks', () => {
  it('keeps a published page local and sends an unpublished one to GitHub', () => {
    const html = rewriteUnpublishedLinks(
      '<a href="./02-core-data-hlm/index.md">Core Data</a><a href="./07-articles/2026-08-19-300M%E2%82%ACY-for-IT.md">6 milliards</a>',
      DOCS,
      ['07-articles']
    )
    expect(html).toBe(
      '<a href="./02-core-data-hlm/index.md">Core Data</a><a href="https://github.com/charnould/pierre/blob/master/docs/07-articles/2026-08-19-300M%E2%82%ACY-for-IT.md">6 milliards</a>'
    )
  })

  it('keeps published links on the core intelligence index local', () => {
    const html = rewriteUnpublishedLinks(
      '<a href="../index.md">PIERRE</a><a href="../02-core-data-hlm/index.md">Core Data</a>',
      join(DOCS, '04-core-intelligence-hlm'),
      []
    )
    expect(html).toBe(
      '<a href="../index.md">PIERRE</a><a href="../02-core-data-hlm/index.md">Core Data</a>'
    )
  })

  it('keeps a link to the core intelligence index local and sends its other files to GitHub', () => {
    const html = rewriteUnpublishedLinks(
      '<a href="./04-core-intelligence-hlm/index.md">Index</a><a href="./04-core-intelligence-hlm/knowledge/foo.md">Foo</a>',
      DOCS,
      [],
      ['04-core-intelligence-hlm']
    )
    expect(html).toBe(
      '<a href="./04-core-intelligence-hlm/index.md">Index</a><a href="https://github.com/charnould/pierre/blob/master/docs/04-core-intelligence-hlm/knowledge/foo.md">Foo</a>'
    )
  })
})
