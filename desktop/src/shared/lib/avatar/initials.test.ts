import { describe, expect, test } from 'bun:test'

import { avatarInitials } from './initials'

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
