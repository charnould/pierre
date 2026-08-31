import { describe, expect, test } from 'bun:test'

import {
  buildReportInjectScript,
  extractReportArticle,
  sanitizeReportHtml
} from './automation-report'

describe('sanitizeReportHtml', () => {
  test('strips script style and event handlers', () => {
    const out = sanitizeReportHtml(
      `<article class="report"><p onclick="alert(1)">ok</p><script>evil()</script><style>x{}</style><link rel="stylesheet" href="x.css"></article>`
    )
    expect(out).toContain('<p>ok</p>')
    expect(out).not.toMatch(/script|style|link|onclick/i)
  })

  test('strips javascript URLs that regex sanitizers miss', () => {
    const out = sanitizeReportHtml(`<a href="javascript:alert(1)">x</a>`)
    expect(out.toLowerCase()).not.toContain('javascript:')
  })
})

describe('extractReportArticle', () => {
  test('keeps article.report from a full document', () => {
    const html = `<!doctype html><html><body><article class="report"><h1>Titre</h1></article></body></html>`
    expect(extractReportArticle(html)).toBe('<article class="report"><h1>Titre</h1></article>')
  })

  test('returns fragment when no article', () => {
    expect(extractReportArticle('<h1>Seul</h1>')).toBe('<h1>Seul</h1>')
  })
})

describe('buildReportInjectScript', () => {
  test('embeds article and mounts charts', () => {
    const js = buildReportInjectScript('<article class="report"><h1>A</h1></article>')
    expect(js).toContain('report-root')
    expect(js).toContain('<article class=\\"report\\"><h1>A</h1></article>')
    expect(js).toContain('__reportMountCharts')
  })
})
