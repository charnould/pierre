import { describe, expect, test } from 'bun:test'

import { parseAvatarEmail, parseAvatarHex } from './avatar'

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

describe('parseAvatarEmail', () => {
  test('normalizes a valid account email', () => {
    expect(parseAvatarEmail('Alice.Martin@Example.org')).toBe('alice.martin@example.org')
  })

  test('rejects empty, path-like, or oversized values', () => {
    expect(parseAvatarEmail('')).toBeNull()
    expect(parseAvatarEmail('../secret')).toBeNull()
    expect(parseAvatarEmail('alice')).toBeNull()
    expect(parseAvatarEmail(`${'x'.repeat(250)}@example.org`)).toBeNull()
  })
})
