import { describe, expect, test } from 'bun:test'

import {
  isReservedDisplayName,
  normalizeDisplayName,
  parseUserPreferences
} from '../../../../shared/automations'
import { User } from '../../../utils/_schema'
import { get_user_preferences } from '../../../utils/automations/store'
import {
  patch_me_preferences,
  resolve_display_name,
  set_display_name
} from '../../../utils/avatar-preferences'
import { save_user } from '../../../utils/handle-user'
import { user_has_avatar } from '../../../utils/user-avatars'
import { use_identity_test_env } from './identity-test-env'

use_identity_test_env('_test_avatar_preferences')

describe('parseUserPreferences', () => {
  test('parses display_name and pinned automation ids', () => {
    expect(parseUserPreferences(null)).toEqual({
      pinned_automation_ids: [],
      display_name: null
    })
    expect(
      parseUserPreferences(
        JSON.stringify({
          pinned_automation_ids: ['a'],
          display_name: '  Alice Martin  '
        })
      )
    ).toEqual({
      pinned_automation_ids: ['a'],
      display_name: 'Alice Martin'
    })
  })
})

describe('normalizeDisplayName', () => {
  test('trims, collapses spaces, truncates', () => {
    expect(normalizeDisplayName('  Alice   Martin  ')).toBe('Alice Martin')
    expect(normalizeDisplayName('')).toBeNull()
    expect(normalizeDisplayName('   ')).toBeNull()
    expect(normalizeDisplayName('x'.repeat(100))?.length).toBe(80)
  })

  test('matches a reserved display name regardless of case and spacing', () => {
    expect(isReservedDisplayName('  pIeRrE  ', 'Pierre')).toBe(true)
    expect(isReservedDisplayName('Pierre Martin', 'Pierre')).toBe(false)
    expect(isReservedDisplayName(null, 'Pierre')).toBe(false)
  })
})

describe('display_name', () => {
  test('defaults to email local-part; custom overrides; clear restores default', async () => {
    await save_user(
      User.parse({
        email: 'alice.martin@exemple.fr',
        role: 'collaborator',
        config: JSON.stringify(['default']),
        password_hash: 'x'
      })
    )

    expect(resolve_display_name('alice.martin@exemple.fr')).toBe('alice.martin')
    expect(user_has_avatar('alice.martin@exemple.fr')).toBe(false)

    expect(set_display_name('alice.martin@exemple.fr', 'Alice Martin')).toBe('Alice Martin')
    expect(get_user_preferences('alice.martin@exemple.fr').display_name).toBe('Alice Martin')
    expect(resolve_display_name('alice.martin@exemple.fr')).toBe('Alice Martin')

    expect(set_display_name('alice.martin@exemple.fr', 'alice.martin')).toBe('alice.martin')
    expect(get_user_preferences('alice.martin@exemple.fr').display_name).toBeNull()

    expect(set_display_name('alice.martin@exemple.fr', 'Bob')).toBe('Bob')
    expect(set_display_name('alice.martin@exemple.fr', null)).toBe('alice.martin')
    expect(get_user_preferences('alice.martin@exemple.fr').display_name).toBeNull()

    await save_user(
      User.parse({
        email: 'pierre@exemple.fr',
        role: 'collaborator',
        config: JSON.stringify(['default']),
        password_hash: 'x'
      })
    )
    expect(patch_me_preferences('pierre@exemple.fr', { display_name: 'PIERRE' })).toEqual({
      hasAvatar: false,
      displayName: 'pierre'
    })
    expect(get_user_preferences('pierre@exemple.fr').display_name).toBeNull()
  })
})
