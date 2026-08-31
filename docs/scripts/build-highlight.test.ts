import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'

import { highlightFences, rewriteUnpublishedLinks } from './build.ts'

const DOCS = join(import.meta.dir, '..')

function fence(lang: string, code: string) {
  return highlightFences(Bun.markdown.html(`\`\`\`${lang}\n${code}\n\`\`\``))
}

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

  it('leaves yml, sh, shell and sql fences unchanged', () => {
    for (const lang of ['yml', 'sh', 'shell', 'sql']) {
      const raw = Bun.markdown.html(`\`\`\`${lang}\nkey: value\n\`\`\``)
      expect(highlightFences(raw)).toBe(raw)
    }
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
      []
    )
    expect(html).toBe(
      '<a href="./04-core-intelligence-hlm/index.md">Index</a><a href="https://github.com/charnould/pierre/blob/master/docs/04-core-intelligence-hlm/knowledge/foo.md">Foo</a>'
    )
  })
})
