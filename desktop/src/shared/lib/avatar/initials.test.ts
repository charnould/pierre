import { describe, expect, test } from 'bun:test'

import { AVATAR_TONE_BACKGROUNDS, avatarInitials, avatarTone } from './initials'

describe('avatarInitials', () => {
  test('uses the first letter of each login segment', () => {
    expect(avatarInitials('alice.martin')).toBe('AM')
    expect(avatarInitials('c-dubois')).toBe('CD')
    expect(avatarInitials('jean_luc.bernard')).toBe('JL')
  })

  test('strips the email domain before taking letters', () => {
    expect(avatarInitials('alice.martin@exemple.fr')).toBe('AM')
  })

  test('falls back to the first two characters', () => {
    expect(avatarInitials('cdubois')).toBe('CD')
    expect(avatarInitials('ab')).toBe('AB')
    expect(avatarInitials('a')).toBe('A')
  })

  test('returns a placeholder when empty', () => {
    expect(avatarInitials('')).toBe('?')
    expect(avatarInitials('   ')).toBe('?')
  })
})

describe('avatarTone', () => {
  test('is stable for a given login', () => {
    expect(avatarTone('alice.martin')).toEqual(avatarTone('Alice.Martin'))
    expect(avatarTone('alice.martin@exemple.fr')).toEqual(avatarTone('alice.martin'))
  })

  test('picks a palette background', () => {
    const backgrounds: readonly string[] = AVATAR_TONE_BACKGROUNDS
    expect(backgrounds).toContain(avatarTone('cdubois').bg)
  })

  test('spreads different logins across the palette', () => {
    const tones = ['alice.martin', 'cdubois', 'jleclerc', 'nberger'].map(
      (login) => avatarTone(login).bg
    )
    expect(new Set(tones).size).toBeGreaterThan(1)
  })
})
