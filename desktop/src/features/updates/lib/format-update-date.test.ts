import { describe, expect, it } from 'bun:test'

import { formatUpdateDate } from '@/features/updates/lib/format-update-date'

describe('formatUpdateDate', () => {
  it('formats dates in fr-FR short month', () => {
    expect(formatUpdateDate('2026-07-15')).toMatch(/15/)
    expect(formatUpdateDate('2026-07-15')).toMatch(/2026/)
  })
})
