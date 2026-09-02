import { beforeEach, describe, expect, it } from 'bun:test'

import { Hono } from 'hono'

import { controller as get_desktop_avatars } from '../../../../../../controllers/desktop/avatars/get'
import { controller as post_desktop_me_avatar } from '../../../../../../controllers/desktop/me/avatar/post'
import { User, type Parsed_User } from '../../../../../../utils/_schema'
import { save_user } from '../../../../../../utils/handle-user'
import { user_has_avatar } from '../../../../../../utils/user-avatars'
import { use_identity_test_env } from '../../../../utils/identity-test-env'

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

const app = new Hono<{ Variables: { user: Parsed_User } }>()
app.post(
  '/desktop/me/avatar',
  async (c, next) => {
    c.set('user', {
      email: 'alice.martin@exemple.fr',
      role: 'collaborator',
      config: ['default'],
      password_hash: 'x'
    })
    await next()
  },
  post_desktop_me_avatar
)
app.get(
  '/desktop/avatars/:email',
  async (c, next) => {
    c.set('user', {
      email: 'alice.martin@exemple.fr',
      role: 'collaborator',
      config: ['default'],
      password_hash: 'x'
    })
    await next()
  },
  get_desktop_avatars
)

use_identity_test_env('_test_me_avatar')

beforeEach(async () => {
  await save_user(
    User.parse({
      email: 'alice.martin@exemple.fr',
      role: 'collaborator',
      config: JSON.stringify(['default']),
      password_hash: 'secret'
    })
  )
})

describe('POST /desktop/me/avatar + GET /desktop/avatars/:email', () => {
  it('stores a WebP blob and serves it', async () => {
    const form = new FormData()
    form.set('avatar', new File([PNG_1x1], 'face.png', { type: 'image/png' }))

    const post = await app.fetch(
      new Request('http://localhost/desktop/me/avatar', { method: 'POST', body: form })
    )
    expect(post.status).toBe(200)
    const body = (await post.json()) as {
      data: { hasAvatar: boolean; avatarBytes: number }
    }
    expect(body.data.hasAvatar).toBe(true)
    expect(body.data.avatarBytes).toBeGreaterThan(0)
    expect(user_has_avatar('alice.martin@exemple.fr')).toBe(true)

    const get = await app.fetch(
      new Request(
        `http://localhost/desktop/avatars/${encodeURIComponent('alice.martin@exemple.fr')}`
      )
    )
    expect(get.status).toBe(200)
    expect(get.headers.get('content-type')).toBe('image/webp')
    const bytes = new Uint8Array(await get.arrayBuffer())
    expect(bytes.byteLength).toBe(body.data.avatarBytes)
    const meta = await new Bun.Image(bytes).metadata()
    expect(meta.width).toBe(256)
    expect(meta.format).toBe('webp')
  })

  it('rejects missing file and unknown login', async () => {
    const missing = await app.fetch(
      new Request('http://localhost/desktop/me/avatar', { method: 'POST', body: new FormData() })
    )
    expect(missing.status).toBe(400)

    const unknown = await app.fetch(new Request('http://localhost/desktop/avatars/ghost.webp'))
    expect(unknown.status).toBe(404)
  })
})
