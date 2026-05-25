import { describe, expect, it } from 'bun:test'

import { patchAuthSetCookieHeaders } from './cookie-patcher'

describe('patchAuthSetCookieHeaders', () => {
  it('rewrites pierre-ia cookies for cross-site Electron frames over HTTPS', () => {
    const headers: Record<string, string[]> = {
      'set-cookie': ['pierre-ia=abc; Path=/; SameSite=Lax']
    }

    patchAuthSetCookieHeaders(headers, { secure: true })

    expect(headers['set-cookie']?.[0]).toContain('SameSite=None')
    expect(headers['set-cookie']?.[0]).toContain('Secure')
    expect(headers['set-cookie']?.[0]).not.toContain('SameSite=Lax')
  })

  it('does not force Secure on HTTP (localhost)', () => {
    const headers: Record<string, string[]> = {
      'set-cookie': ['pierre-ia=abc; Path=/; SameSite=Lax']
    }

    patchAuthSetCookieHeaders(headers, { secure: false })

    const cookie = headers['set-cookie']?.[0] ?? ''
    expect(cookie).toContain('pierre-ia=abc')
    expect(cookie).not.toContain('Secure')
    expect(cookie).not.toContain('SameSite=None')
  })

  it('leaves unrelated cookies untouched', () => {
    const headers: Record<string, string[]> = {
      'set-cookie': ['other=1; Path=/']
    }

    patchAuthSetCookieHeaders(headers, { secure: true })

    expect(headers['set-cookie']?.[0]).toBe('other=1; Path=/')
  })
})
