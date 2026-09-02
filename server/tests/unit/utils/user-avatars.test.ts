import { describe, expect, test } from 'bun:test'

import { User } from '../../../utils/_schema'
import { encode_user_avatar } from '../../../utils/avatar-image'
import { delete_all_users, save_user } from '../../../utils/handle-user'
import {
  clear_user_avatar,
  get_user_avatar,
  list_avatar_meta,
  set_user_avatar,
  user_has_avatar
} from '../../../utils/user-avatars'
import { use_identity_test_env } from './identity-test-env'

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

use_identity_test_env('_test_user_avatars')

describe('user-avatars store', () => {
  test('upsert, list meta without blob, clear', async () => {
    await delete_all_users()
    await save_user(
      User.parse({
        email: 'alice.martin@exemple.fr',
        role: 'collaborator',
        config: JSON.stringify(['default']),
        password_hash: 'x'
      })
    )

    expect(user_has_avatar('alice.martin@exemple.fr')).toBe(false)
    expect(get_user_avatar('alice.martin@exemple.fr')).toBeNull()
    expect(list_avatar_meta().size).toBe(0)

    const encoded = await encode_user_avatar(PNG_1x1)
    if ('error' in encoded) throw new Error(encoded.error)
    set_user_avatar('alice.martin@exemple.fr', encoded)

    expect(user_has_avatar('alice.martin@exemple.fr')).toBe(true)
    expect(get_user_avatar('alice.martin@exemple.fr')?.byteLength).toBe(encoded.byteLength)
    expect(list_avatar_meta().get('alice.martin@exemple.fr')).toEqual({
      bytes: encoded.byteLength,
      version: 1
    })

    clear_user_avatar('alice.martin@exemple.fr')
    expect(user_has_avatar('alice.martin@exemple.fr')).toBe(false)
    expect(get_user_avatar('alice.martin@exemple.fr')).toBeNull()
  })
})
