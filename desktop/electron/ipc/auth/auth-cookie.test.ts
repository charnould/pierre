import { describe, expect, it } from 'bun:test'

import { parsePierreAuthCookieValue, pierreAuthCookieLinesFromResponse } from './auth-cookie'

describe('parsePierreAuthCookieValue', () => {
  it('extracts value from Set-Cookie line', () => {
    expect(parsePierreAuthCookieValue('pierre-ia=abc123; Path=/; HttpOnly')).toBe('abc123')
  })

  it('returns null for unrelated cookies', () => {
    expect(parsePierreAuthCookieValue('other=1; Path=/')).toBeNull()
  })

  it('decodes URI-encoded values', () => {
    expect(parsePierreAuthCookieValue('pierre-ia=hello%2Bworld; Path=/')).toBe('hello+world')
  })
})

describe('pierreAuthCookieLinesFromResponse', () => {
  it('reads pierre-ia from getSetCookie when available', () => {
    const resp = {
      headers: {
        getSetCookie: () => ['pierre-ia=x; Path=/', 'other=1'],
        get: () => null
      }
    } as unknown as Response

    expect(pierreAuthCookieLinesFromResponse(resp)).toEqual(['pierre-ia=x; Path=/'])
  })

  it('falls back to set-cookie header', () => {
    const resp = {
      headers: {
        getSetCookie: undefined,
        get: (name: string) => (name === 'set-cookie' ? 'pierre-ia=y; Path=/; HttpOnly' : null)
      }
    } as unknown as Response

    expect(pierreAuthCookieLinesFromResponse(resp)).toEqual(['pierre-ia=y; Path=/; HttpOnly'])
  })
})
