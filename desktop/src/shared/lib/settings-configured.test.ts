import { describe, expect, it } from 'bun:test'

import { isSettingsConfigured, publicSettings } from './settings-configured'

describe('isSettingsConfigured', () => {
  it('accepts url, email, password without loggedOut', () => {
    expect(
      isSettingsConfigured({
        url: 'https://example.test',
        email: 'a@b.c',
        password: 'secret'
      })
    ).toBe(true)
  })

  it('rejects loggedOut, missing fields, or null', () => {
    expect(
      isSettingsConfigured({
        url: 'https://example.test',
        email: 'a@b.c',
        password: 'secret',
        loggedOut: true
      })
    ).toBe(false)
    expect(isSettingsConfigured({ url: 'https://example.test', email: 'a@b.c' })).toBe(false)
    expect(isSettingsConfigured(null)).toBe(false)
  })

  it('accepts hasPassword when the secret stays in the main process', () => {
    expect(
      isSettingsConfigured({
        url: 'https://example.test',
        email: 'a@b.c',
        hasPassword: true
      })
    ).toBe(true)
    expect(
      isSettingsConfigured({
        url: 'https://example.test',
        email: 'a@b.c',
        hasPassword: false
      })
    ).toBe(false)
  })
})

describe('publicSettings', () => {
  it('redacts password and reports hasPassword', () => {
    expect(
      publicSettings({ url: 'https://example.test', email: 'a@b.c', password: 'secret' })
    ).toEqual({
      url: 'https://example.test',
      email: 'a@b.c',
      hasPassword: true
    })
    expect(publicSettings({ url: 'https://example.test' })).toEqual({
      url: 'https://example.test',
      hasPassword: false
    })
    expect(publicSettings(null)).toEqual({})
  })
})
