import { describe, expect, test } from 'bun:test'

import { isTab, normalizeStoredTab } from './tabs'

describe('isTab', () => {
  test('accepts current tab ids', () => {
    expect(isTab('home')).toBe(true)
    expect(isTab('request')).toBe(true)
  })

  test('rejects unknown ids', () => {
    expect(isTab('agent')).toBe(false)
    expect(isTab('clearance')).toBe(false)
  })
})

describe('normalizeStoredTab', () => {
  test('redirects repayment to home when feature is disabled', () => {
    expect(normalizeStoredTab('repayment')).toBe('home')
  })

  test('passes through other tabs', () => {
    expect(normalizeStoredTab('request')).toBe('request')
  })
})
