import { beforeEach, describe, expect, it } from 'bun:test'

import { Hono } from 'hono'

import { controller as patch_desktop_me_preferences } from '../../../../../../controllers/desktop/me/preferences/patch'
import { User, type Parsed_User } from '../../../../../../utils/_schema'
import {
  get_user_preferences,
  set_user_preferences
} from '../../../../../../utils/automations/store'
import { encode_user_avatar } from '../../../../../../utils/avatar-image'
import { save_user } from '../../../../../../utils/handle-user'
import { set_user_avatar, user_has_avatar } from '../../../../../../utils/user-avatars'
import { use_identity_test_env } from '../../../../utils/identity-test-env'

const app = new Hono<{ Variables: { user: Parsed_User } }>()
app.patch(
  '/desktop/me/preferences',
  async (c, next) => {
    c.set('user', {
      email: 'alice.martin@exemple.fr',
      role: 'collaborator',
      config: ['default'],
      password_hash: 'x'
    })
    await next()
  },
  patch_desktop_me_preferences
)

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

use_identity_test_env('_test_me_preferences')

beforeEach(async () => {
  await save_user(
    User.parse({
      email: 'alice.martin@exemple.fr',
      role: 'collaborator',
      config: JSON.stringify(['default']),
      password_hash: 'secret'
    })
  )
  set_user_preferences('alice.martin@exemple.fr', {
    pinned_automation_ids: ['auto-1'],
    display_name: null
  })
})

describe('PATCH /desktop/me/preferences', () => {
  it('clears a stored photo and preserves pinned automations', async () => {
    const encoded = await encode_user_avatar(PNG_1x1)
    if ('error' in encoded) throw new Error(encoded.error)
    set_user_avatar('alice.martin@exemple.fr', encoded)
    expect(user_has_avatar('alice.martin@exemple.fr')).toBe(true)

    const res = await app.fetch(
      new Request('http://localhost/desktop/me/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ avatar: null })
      })
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { hasAvatar: boolean; displayName: string } }
    expect(body.data.hasAvatar).toBe(false)
    expect(body.data.displayName).toBe('alice.martin')
    expect(user_has_avatar('alice.martin@exemple.fr')).toBe(false)
    expect(get_user_preferences('alice.martin@exemple.fr').pinned_automation_ids).toEqual([
      'auto-1'
    ])
  })

  it('rejects a non-null avatar payload', async () => {
    const res = await app.fetch(
      new Request('http://localhost/desktop/me/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ avatar: { version: 1 } })
      })
    )
    expect(res.status).toBe(400)
  })

  it('updates display_name and clears back to email local-part', async () => {
    const setRes = await app.fetch(
      new Request('http://localhost/desktop/me/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ display_name: 'Alice Martin' })
      })
    )
    expect(setRes.status).toBe(200)
    const setBody = (await setRes.json()) as { data: { displayName: string } }
    expect(setBody.data.displayName).toBe('Alice Martin')
    expect(get_user_preferences('alice.martin@exemple.fr').display_name).toBe('Alice Martin')

    const clearRes = await app.fetch(
      new Request('http://localhost/desktop/me/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ display_name: null })
      })
    )
    expect(clearRes.status).toBe(200)
    const clearBody = (await clearRes.json()) as { data: { displayName: string } }
    expect(clearBody.data.displayName).toBe('alice.martin')
    expect(get_user_preferences('alice.martin@exemple.fr').display_name).toBeNull()
  })

  it('rejects the configured AI name regardless of case and spacing', async () => {
    set_user_preferences('alice.martin@exemple.fr', {
      pinned_automation_ids: ['auto-1'],
      display_name: 'Alice Martin'
    })

    const res = await app.fetch(
      new Request('http://localhost/desktop/me/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ display_name: '  pIeRrE  ' })
      })
    )

    expect(res.status).toBe(400)
    expect(get_user_preferences('alice.martin@exemple.fr').display_name).toBe('Alice Martin')
  })
})
