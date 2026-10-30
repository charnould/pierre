import { beforeEach, describe, expect, it } from 'bun:test'

import { Hono } from 'hono'

import { getMe } from '../../../../../routes/account'
import type { User } from '../../../../../utils/_schema'
import { set_user_preferences } from '../../../../../utils/automations/store'
import { createTestUser } from '../../../../test-user'
import { use_identity_test_env } from '../../../utils/identity-test-env'

const user: User = {
  email: 'alice.martin@exemple.fr',
  isAdministrator: false,
  moduleIds: [],
  chatbotIds: ['default']
}

const app = new Hono<{ Variables: { user: User } }>()
app.get(
  '/me',
  async (c, next) => {
    c.set('user', user)
    await next()
  },
  getMe
)

use_identity_test_env('_test_me')

beforeEach(async () => {
  await createTestUser(user)
})

describe('GET /me', () => {
  it('returns the preferred name with the authenticated principal', async () => {
    set_user_preferences(user.email, {
      pinnedAutomationIds: [],
      displayName: null,
      preferredName: 'Alice'
    })

    const response = await app.fetch(new Request('http://localhost/me'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: {
        ...user,
        preferredName: 'Alice'
      }
    })
  })
})
