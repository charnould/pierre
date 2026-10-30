import { beforeEach, describe, expect, it } from 'bun:test'

import { Hono } from 'hono'

import { patchPreferences as patch_app_me_preferences } from '../../../../../../routes/account'
import type { User } from '../../../../../../utils/_schema'
import {
  get_user_preferences,
  set_user_preferences
} from '../../../../../../utils/automations/store'
import { encode_user_avatar } from '../../../../../../utils/avatar-image'
import { set_user_avatar, user_has_avatar } from '../../../../../../utils/user-avatars'
import { createTestUser } from '../../../../../test-user'
import { use_identity_test_env } from '../../../../utils/identity-test-env'

const app = new Hono<{ Variables: { user: User } }>()
app.patch(
  '/me/preferences',
  async (c, next) => {
    c.set('user', {
      email: 'alice.martin@exemple.fr',
      isAdministrator: false,
      moduleIds: [],
      chatbotIds: ['default']
    })
    await next()
  },
  patch_app_me_preferences
)

const PNG_1x1 = Uint8Array.fromBase64(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
)

use_identity_test_env('_test_me_preferences')

beforeEach(async () => {
  await createTestUser({
    email: 'alice.martin@exemple.fr',
    isAdministrator: false,
    moduleIds: [],
    chatbotIds: ['default']
  })
  set_user_preferences('alice.martin@exemple.fr', {
    pinnedAutomationIds: ['auto-1'],
    displayName: null,
    preferredName: null
  })
})

describe('PATCH /me/preferences', () => {
  it('clears a stored photo and preserves pinned automations', async () => {
    const encoded = await encode_user_avatar(PNG_1x1)
    if ('error' in encoded) throw new Error(encoded.error)
    set_user_avatar('alice.martin@exemple.fr', encoded)
    expect(user_has_avatar('alice.martin@exemple.fr')).toBe(true)

    const res = await app.fetch(
      new Request('http://localhost/me/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ avatar: null })
      })
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { hasAvatar: boolean; displayName: string; preferredName: string | null }
    }
    expect(body.data.hasAvatar).toBe(false)
    expect(body.data.displayName).toBe('alice.martin')
    expect(body.data.preferredName).toBeNull()
    expect(user_has_avatar('alice.martin@exemple.fr')).toBe(false)
    expect(get_user_preferences('alice.martin@exemple.fr').pinnedAutomationIds).toEqual(['auto-1'])
  })

  it('rejects a non-null avatar payload', async () => {
    const res = await app.fetch(
      new Request('http://localhost/me/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ avatar: { version: 1 } })
      })
    )
    expect(res.status).toBe(400)
  })

  it('updates display_name and clears back to email local-part', async () => {
    const setRes = await app.fetch(
      new Request('http://localhost/me/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName: 'Alice Martin' })
      })
    )
    expect(setRes.status).toBe(200)
    const setBody = (await setRes.json()) as { data: { displayName: string } }
    expect(setBody.data.displayName).toBe('Alice Martin')
    expect(get_user_preferences('alice.martin@exemple.fr').displayName).toBe('Alice Martin')

    const clearRes = await app.fetch(
      new Request('http://localhost/me/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName: null })
      })
    )
    expect(clearRes.status).toBe(200)
    const clearBody = (await clearRes.json()) as { data: { displayName: string } }
    expect(clearBody.data.displayName).toBe('alice.martin')
    expect(get_user_preferences('alice.martin@exemple.fr').displayName).toBeNull()
  })

  it('sets and clears the preferred name without changing other preferences', async () => {
    const setRes = await app.fetch(
      new Request('http://localhost/me/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ preferredName: '  Alice   ' })
      })
    )
    expect(setRes.status).toBe(200)
    const setBody = (await setRes.json()) as {
      data: { preferredName: string | null }
    }
    expect(setBody.data.preferredName).toBe('Alice')
    expect(get_user_preferences('alice.martin@exemple.fr')).toEqual({
      pinnedAutomationIds: ['auto-1'],
      displayName: null,
      preferredName: 'Alice'
    })

    const clearRes = await app.fetch(
      new Request('http://localhost/me/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ preferredName: null })
      })
    )
    expect(clearRes.status).toBe(200)
    expect(get_user_preferences('alice.martin@exemple.fr').preferredName).toBeNull()
  })

  it('rejects the stored snake_case key at the API boundary', async () => {
    const response = await app.fetch(
      new Request('http://localhost/me/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ preferred_name: 'Alice' })
      })
    )

    expect(response.status).toBe(400)
    expect(get_user_preferences('alice.martin@exemple.fr').preferredName).toBeNull()
  })

  it('rejects the configured AI name regardless of case and spacing', async () => {
    set_user_preferences('alice.martin@exemple.fr', {
      pinnedAutomationIds: ['auto-1'],
      displayName: 'Alice Martin',
      preferredName: null
    })

    const res = await app.fetch(
      new Request('http://localhost/me/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName: '  pIeRrE  ' })
      })
    )

    expect(res.status).toBe(400)
    expect(get_user_preferences('alice.martin@exemple.fr').displayName).toBe('Alice Martin')
  })
})
