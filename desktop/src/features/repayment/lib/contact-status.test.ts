import { describe, expect, test } from 'bun:test'

import { formatContactValue, hasContactValue, resolveContactStatusBadge } from './contact-status'

describe('resolveContactStatusBadge', () => {
  test('returns null when value is empty', () => {
    expect(resolveContactStatusBadge(null, 'ok', 'email')).toBeNull()
    expect(resolveContactStatusBadge('', 'sms_compatible', 'telephone')).toBeNull()
    expect(resolveContactStatusBadge('   ', 'ok', 'email')).toBeNull()
  })

  test('returns null when value present but status missing', () => {
    expect(resolveContactStatusBadge('a@b.co', null, 'email')).toBeNull()
  })

  test('maps email and telephone statuses', () => {
    expect(resolveContactStatusBadge('a@b.co', 'ok', 'email')).toEqual({
      label: 'OK',
      variant: 'secondary'
    })
    expect(resolveContactStatusBadge('a@b.co', 'hard_bounce', 'email')).toEqual({
      label: 'Hard bounce',
      variant: 'destructive'
    })
    expect(resolveContactStatusBadge('+33611563959', 'sms_compatible', 'telephone')).toEqual({
      label: 'SMS',
      variant: 'secondary'
    })
    expect(resolveContactStatusBadge('+33611563959', 'invalid', 'telephone')).toEqual({
      label: 'Invalide',
      variant: 'destructive'
    })
  })

  test('unknown status key has no badge', () => {
    expect(resolveContactStatusBadge('a@b.co', 'weird', 'email')).toBeNull()
  })
})

describe('formatContactValue / hasContactValue', () => {
  test('formats and detects presence', () => {
    expect(formatContactValue('a@b.co')).toBe('a@b.co')
    expect(formatContactValue(null)).toBe('Non renseigné')
    expect(hasContactValue('a@b.co')).toBe(true)
    expect(hasContactValue(null)).toBe(false)
  })
})
