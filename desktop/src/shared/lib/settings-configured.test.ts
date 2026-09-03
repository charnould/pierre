import { describe, expect, it } from 'bun:test'

import { isSettingsConfigured } from './settings-configured'

describe('isSettingsConfigured', () => {
  it('accepts a stored server URL', () => {
    expect(isSettingsConfigured({ url: 'https://example.test' })).toBe(true)
  })

  it('rejects a missing URL or null settings', () => {
    expect(isSettingsConfigured({})).toBe(false)
    expect(isSettingsConfigured({ url: '' })).toBe(false)
    expect(isSettingsConfigured(null)).toBe(false)
  })
})
