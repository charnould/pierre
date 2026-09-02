import { describe, expect, test } from 'bun:test'

import { parseAvatarHex, parseAvatarLogin } from './avatar'

describe('parseAvatarHex', () => {
  test('accepts lowercase 6-digit hex', () => {
    expect(parseAvatarHex('#5a7eb5')).toBe('#5a7eb5')
  })

  test('rejects invalid values', () => {
    expect(parseAvatarHex(null)).toBeNull()
    expect(parseAvatarHex('#fff')).toBeNull()
    expect(parseAvatarHex('#FFDFC4')).toBeNull()
    expect(parseAvatarHex('navy')).toBeNull()
  })
})

describe('parseAvatarLogin', () => {
  test('normalizes a valid email local-part', () => {
    expect(parseAvatarLogin('Alice.Martin')).toBe('alice.martin')
  })

  test('rejects empty, path-like, or oversized values', () => {
    expect(parseAvatarLogin('')).toBeNull()
    expect(parseAvatarLogin('../secret')).toBeNull()
    expect(parseAvatarLogin('a/b')).toBeNull()
    expect(parseAvatarLogin('x'.repeat(81))).toBeNull()
  })
})
