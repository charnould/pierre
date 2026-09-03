import { describe, expect, it } from 'bun:test'

import { Hono } from 'hono'

import { controller as get_desktop_users } from '../../../../../controllers/desktop/users/get'
import { User } from '../../../../../utils/_schema'
import { set_user_preferences } from '../../../../../utils/automations/store'
import { encode_user_avatar } from '../../../../../utils/avatar-image'
import { save_user } from '../../../../../utils/handle-user'
import { set_user_avatar } from '../../../../../utils/user-avatars'
import { use_identity_test_env } from '../../../utils/identity-test-env'

const app = new Hono()
app.get('/desktop/users', get_desktop_users)

const fetch_users = (): Promise<Response> =>
  Promise.resolve(app.fetch(new Request('http://localhost/desktop/users')))

const PNG_1x1 = Uint8Array.fromBase64(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
)

use_identity_test_env('_test_desktop_users')

describe('GET /desktop/users', () => {
  it('returns only public identity and avatar metadata', async () => {
    expect(await (await fetch_users()).json()).toEqual({ users: [] })

    await save_user(
      User.parse({
        email: 'Alice.Martin@exemple.fr',
        role: 'collaborator',
        config: JSON.stringify(['default', 'agent']),
        password_hash: 'secret-hash'
      })
    )
    await save_user(
      User.parse({
        email: 'bob.leroy@exemple.fr',
        role: 'administrator',
        config: JSON.stringify(['default']),
        password_hash: 'another-secret'
      })
    )
    set_user_preferences('bob.leroy@exemple.fr', {
      pinned_automation_ids: [],
      display_name: null
    })
    const encoded = await encode_user_avatar(PNG_1x1)
    if ('error' in encoded) throw new Error(encoded.error)
    set_user_avatar('bob.leroy@exemple.fr', encoded)

    const res = await fetch_users()
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      users: Array<{
        login: string
        email: string
        hasAvatar: boolean
        avatarBytes: number
        avatarVersion: number
        displayName: string
      }>
    }

    expect(body.users).toHaveLength(2)
    expect(body.users[0]).toMatchObject({
      login: 'alice.martin',
      email: 'alice.martin@exemple.fr',
      hasAvatar: false,
      avatarBytes: 0,
      avatarVersion: 0,
      displayName: 'alice.martin'
    })
    expect(body.users[1]).toMatchObject({
      login: 'bob.leroy',
      email: 'bob.leroy@exemple.fr',
      hasAvatar: true,
      avatarBytes: encoded.byteLength,
      avatarVersion: 1,
      displayName: 'bob.leroy'
    })

    const raw = JSON.stringify(body)
    expect(raw).not.toContain('password_hash')
    expect(raw).not.toContain('secret')
    expect(raw).not.toContain('UklGR')
  })
})
