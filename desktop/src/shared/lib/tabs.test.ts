import { describe, expect, test } from 'bun:test'

import { isTab } from './tabs'

describe('isTab', () => {
  test('accepts current tab ids', () => {
    expect(isTab('home')).toBe(true)
    expect(isTab('tickets')).toBe(true)
    expect(isTab('repayment')).toBe(true)
    expect(isTab('insurance-attestation')).toBe(true)
    expect(isTab('relocation')).toBe(true)
    expect(isTab('attributions')).toBe(true)
    expect(isTab('ventes')).toBe(true)
    expect(isTab('automations')).toBe(true)
    expect(isTab('bulk')).toBe(true)
  })

  test('rejects unknown ids', () => {
    expect(isTab('agent')).toBe(false)
    expect(isTab('clearance')).toBe(false)
    expect(isTab('request')).toBe(false)
    expect(isTab('updates')).toBe(false)
    expect(isTab('markdown')).toBe(false)
    expect(isTab('outreach')).toBe(false)
  })
})
