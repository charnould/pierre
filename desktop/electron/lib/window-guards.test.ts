import { describe, expect, it } from 'bun:test'

import { isAllowedNavigation } from './window-guards'

const DEV = 'http://localhost:5173'

describe('isAllowedNavigation', () => {
  it('allows a URL whose origin is in the allowlist', () => {
    expect(isAllowedNavigation(`${DEV}/index.html`, [DEV])).toBe(true)
    expect(
      isAllowedNavigation('https://erp.example.org/ticket/1', ['https://erp.example.org'])
    ).toBe(true)
  })

  it('rejects an origin that is not in the allowlist', () => {
    expect(isAllowedNavigation('https://evil.example/', [DEV, 'file:'])).toBe(false)
    expect(isAllowedNavigation('http://localhost:5174/', [DEV])).toBe(false)
  })

  it('allows file: URLs when file: is listed', () => {
    expect(isAllowedNavigation('file:///Users/x/renderer/index.html', ['file:'])).toBe(true)
  })

  it('rejects file: URLs when file: is not listed', () => {
    expect(isAllowedNavigation('file:///etc/passwd', [DEV])).toBe(false)
  })

  it('rejects javascript: and data: URLs', () => {
    expect(isAllowedNavigation('javascript:void(0)', [DEV, 'file:'])).toBe(false)
    expect(isAllowedNavigation('data:text/html,<script>x</script>', [DEV, 'file:'])).toBe(false)
  })

  it('rejects blob: URLs even when the wrapped origin is allowlisted', () => {
    expect(isAllowedNavigation(`blob:${DEV}/2b4c-uuid`, [DEV, 'file:'])).toBe(false)
  })

  it('rejects unparseable and empty input', () => {
    expect(isAllowedNavigation('', [DEV, 'file:'])).toBe(false)
    expect(isAllowedNavigation('not a url', [DEV, 'file:'])).toBe(false)
    expect(isAllowedNavigation('\\\\server\\share\\thing.exe', [DEV, 'file:'])).toBe(false)
  })

  it('rejects about:blank', () => {
    expect(isAllowedNavigation('about:blank', [DEV, 'file:'])).toBe(false)
  })
})
