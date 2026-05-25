import { describe, expect, test } from 'bun:test'

import { normalizeReasoningText } from './ReasoningPlainContent'

describe('normalizeReasoningText', () => {
  test('flattens bullet lines from server', () => {
    expect(normalizeReasoningText('- step one\n- step two')).toBe('step one step two')
  })

  test('collapses excessive blank lines before tool traces', () => {
    const raw = 'Let me search for information.\n\n\n\nbash · sqlite3 /knowledge/db.sqlite'
    expect(normalizeReasoningText(raw)).toBe(
      'Let me search for information.\nbash · sqlite3 /knowledge/db.sqlite'
    )
  })

  test('removes empty lines', () => {
    expect(normalizeReasoningText('line one\n\n\nline two')).toBe('line one\nline two')
  })
})
