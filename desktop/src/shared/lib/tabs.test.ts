import { describe, expect, test } from 'bun:test'

import { isTab, migrateLegacyTabId } from './tabs'

describe('isTab', () => {
  test('accepts current tab ids', () => {
    expect(isTab('home')).toBe(true)
    expect(isTab('tickets')).toBe(true)
    expect(isTab('repayment')).toBe(true)
    expect(isTab('insurance-attestation')).toBe(true)
    expect(isTab('relocation')).toBe(true)
    expect(isTab('updates')).toBe(true)
  })

  test('rejects unknown ids', () => {
    expect(isTab('agent')).toBe(false)
    expect(isTab('clearance')).toBe(false)
    expect(isTab('request')).toBe(false)
  })
})

describe('migrateLegacyTabId', () => {
  test('maps request to tickets', () => {
    expect(migrateLegacyTabId('request')).toBe('tickets')
    expect(migrateLegacyTabId('home')).toBe('home')
  })
})
