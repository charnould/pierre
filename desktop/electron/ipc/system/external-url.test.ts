import { describe, expect, it } from 'bun:test'

import { isAllowedExternalUrl } from './external-url'

describe('isAllowedExternalUrl', () => {
  it('allows https: URLs, as used by every current link call site', () => {
    expect(isAllowedExternalUrl('https://github.com/charnould/pierre')).toBe(true)
    expect(isAllowedExternalUrl('https://github.com/charnould/pierre/releases')).toBe(true)
    expect(
      isAllowedExternalUrl(
        'https://github.com/charnould/pierre/blob/master/docs/updates/x-y/index.md'
      )
    ).toBe(true)
  })

  it('allows mailto: URLs, as used by the contact buttons', () => {
    expect(isAllowedExternalUrl('mailto:someone@example.org')).toBe(true)
    expect(isAllowedExternalUrl('mailto:charnould@pierre-ia.org')).toBe(true)
  })

  it('rejects http: URLs', () => {
    expect(isAllowedExternalUrl('http://example.org')).toBe(false)
  })

  it('rejects file: URLs', () => {
    expect(isAllowedExternalUrl('file:///etc/passwd')).toBe(false)
  })

  it('rejects javascript: URLs', () => {
    expect(isAllowedExternalUrl('javascript:void(0)')).toBe(false)
  })

  it('rejects data: URLs', () => {
    expect(isAllowedExternalUrl('data:text/html,x')).toBe(false)
  })

  it('rejects a Windows UNC-style path', () => {
    expect(isAllowedExternalUrl('\\\\server\\share\\thing.exe')).toBe(false)
  })

  it('rejects empty and whitespace-only input', () => {
    expect(isAllowedExternalUrl('')).toBe(false)
    expect(isAllowedExternalUrl('   ')).toBe(false)
  })

  it('rejects non-string input', () => {
    expect(isAllowedExternalUrl(null)).toBe(false)
    expect(isAllowedExternalUrl(42)).toBe(false)
    expect(isAllowedExternalUrl(undefined)).toBe(false)
  })

  it('allows an https: URL with surrounding whitespace', () => {
    expect(isAllowedExternalUrl('  https://github.com/charnould/pierre  ')).toBe(true)
  })
})
