import { describe, expect, it } from 'bun:test'

import { aravisLoginOrigin, resolveAravisLoginUrl } from './aravis-login-url'

describe('resolveAravisLoginUrl', () => {
  it('prefers explicit aravis_login_url', () => {
    expect(
      resolveAravisLoginUrl(
        'http://localhost:56570/login',
        'http://localhost:56570/aravis-1?id={id}'
      )
    ).toBe('http://localhost:56570/login')
  })

  it('derives login URL from ticket_url_pattern', () => {
    expect(
      resolveAravisLoginUrl(undefined, 'http://localhost:56570/aravis-1?id={id_reclamation}')
    ).toBe('http://localhost:56570/aravis-1')
  })

  it('returns undefined when no URL is available', () => {
    expect(resolveAravisLoginUrl(undefined, undefined)).toBeUndefined()
    expect(resolveAravisLoginUrl('  ', '  ')).toBeUndefined()
  })
})

describe('aravisLoginOrigin', () => {
  it('returns origin for valid URLs', () => {
    expect(aravisLoginOrigin('http://localhost:56570/aravis-1')).toBe('http://localhost:56570')
  })

  it('returns null for invalid URLs', () => {
    expect(aravisLoginOrigin('not-a-url')).toBeNull()
  })
})
