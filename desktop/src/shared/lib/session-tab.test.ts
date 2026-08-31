import { describe, expect, test } from 'bun:test'

import {
  ACTIVE_TAB_STORAGE_KEY,
  readStoredTab,
  tabAfterAutoLogin,
  writeStoredTab
} from './session-tab'

function mockStorage(): Storage {
  const map = new Map<string, string>()
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size
    }
  } as Storage
}

describe('session-tab', () => {
  test('readStoredTab returns null for invalid value', () => {
    const s = mockStorage()
    s.setItem(ACTIVE_TAB_STORAGE_KEY, 'invalid')
    expect(readStoredTab(s)).toBeNull()
  })

  test('readStoredTab returns null for obsolete tab ids', () => {
    const s = mockStorage()
    s.setItem(ACTIVE_TAB_STORAGE_KEY, 'agent')
    expect(readStoredTab(s)).toBeNull()
  })

  test('writeStoredTab persists workflow tab', () => {
    const s = mockStorage()
    writeStoredTab('tickets', s)
    expect(readStoredTab(s)).toBe('tickets')
  })

  test('readStoredTab returns null for retired tab ids', () => {
    const s = mockStorage()
    s.setItem(ACTIVE_TAB_STORAGE_KEY, 'request')
    expect(readStoredTab(s)).toBeNull()
    s.setItem(ACTIVE_TAB_STORAGE_KEY, 'markdown')
    expect(readStoredTab(s)).toBeNull()
  })

  test('writeStoredTab clears storage for settings', () => {
    const s = mockStorage()
    writeStoredTab('tickets', s)
    writeStoredTab('settings', s)
    expect(readStoredTab(s)).toBeNull()
  })

  test('tabAfterAutoLogin prefers stored tab over home', () => {
    expect(tabAfterAutoLogin('about')).toBe('about')
    expect(tabAfterAutoLogin(null)).toBe('home')
    expect(tabAfterAutoLogin('settings')).toBe('home')
  })

  test('readStoredTab keeps repayment tab', () => {
    const s = mockStorage()
    s.setItem(ACTIVE_TAB_STORAGE_KEY, 'repayment')
    expect(readStoredTab(s)).toBe('repayment')
  })

  test('readStoredTab migrates retired outreach tab to automations', () => {
    const s = mockStorage()
    s.setItem(ACTIVE_TAB_STORAGE_KEY, 'outreach')
    expect(readStoredTab(s)).toBe('automations')
  })
})
