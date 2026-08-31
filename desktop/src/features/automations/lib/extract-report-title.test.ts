import { describe, expect, test } from 'bun:test'

import { extractReportTitle } from './extract-report-title'

describe('extractReportTitle', () => {
  test('reads h1 text', () => {
    expect(
      extractReportTitle('<article class="report"><h1>Appels <em>2026</em></h1></article>', 'x')
    ).toBe('Appels 2026')
  })

  test('falls back to markdown heading then fallback', () => {
    expect(extractReportTitle('# Ancien titre\n\ncorps', 'x')).toBe('Ancien titre')
    expect(extractReportTitle('<p>sans titre</p>', 'fallback')).toBe('fallback')
  })
})
