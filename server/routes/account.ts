import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

import { parseAvatarEmail } from '../../shared/avatar'
import { type AuthContext, authenticate, type AuthEnv } from '../utils/authenticate-user'
import { get_user_preferences } from '../utils/automations/store'
import { AVATAR_MAX_UPLOAD_BYTES, encode_user_avatar } from '../utils/avatar-image'
import { patch_me_preferences, resolve_display_name } from '../utils/avatar-preferences'
import { get_user_avatar, list_user_identities, set_user_avatar } from '../utils/user-avatars'

const AVATAR_FIELD = 'avatar'
const MAX_CONCURRENT_AVATAR_ENCODINGS = 2
let activeAvatarEncodings = 0

export const getMe = (c: AuthContext) => {
  const user = c.get('user')
  return c.json({
    data: {
      ...user,
      preferredName: get_user_preferences(user.email).preferredName
    }
  })
}

export const patchPreferences = async (c: AuthContext) => {
  const user = c.get('user')

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid JSON body' } }, 400)
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid JSON body' } }, 400)
  }
  const record = body as Record<string, unknown>
  if ('display_name' in record || 'preferred_name' in record || 'pinned_automation_ids' in record) {
    return c.json({ error: { code: 'invalid_body', message: 'Unknown field' } }, 400)
  }
  const mapped: { avatar?: unknown; display_name?: unknown; preferred_name?: unknown } = {}
  if ('avatar' in record) mapped.avatar = record['avatar']
  if ('displayName' in record) mapped.display_name = record['displayName']
  if ('preferredName' in record) mapped.preferred_name = record['preferredName']

  const result = patch_me_preferences(user.email, mapped)
  if ('error' in result) {
    return c.json({ error: { code: 'invalid_body', message: result.error } }, 400)
  }

  return c.json({ data: result })
}

export const postAvatar = async (c: AuthContext) => {
  const user = c.get('user')

  let body: Record<string, unknown>
  try {
    body = await c.req.parseBody()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid multipart body' } }, 400)
  }

  const file = body[AVATAR_FIELD]
  if (!(file instanceof Blob) || file.size === 0) {
    return c.json({ error: { code: 'invalid_body', message: 'avatar file required' } }, 400)
  }
  if (file.size > AVATAR_MAX_UPLOAD_BYTES) {
    return c.json({ error: { code: 'avatar_too_large', message: 'image too large' } }, 413)
  }

  if (activeAvatarEncodings >= MAX_CONCURRENT_AVATAR_ENCODINGS) {
    return c.json({ error: { code: 'server_busy', message: 'Avatar encoder is busy' } }, 429)
  }
  activeAvatarEncodings++
  let encoded: Awaited<ReturnType<typeof encode_user_avatar>>
  try {
    encoded = await encode_user_avatar(new Uint8Array(await file.arrayBuffer()))
  } finally {
    activeAvatarEncodings--
  }
  if ('error' in encoded) {
    return c.json({ error: { code: 'invalid_body', message: encoded.error } }, 400)
  }

  const avatarVersion = set_user_avatar(user.email, encoded)
  return c.json({
    data: {
      hasAvatar: true,
      avatarBytes: encoded.byteLength,
      avatarVersion,
      displayName: resolve_display_name(user.email)
    }
  })
}

export const getAvatar = async (c: AuthContext) => {
  const email = parseAvatarEmail(c.req.param('email'))
  if (!email) {
    return c.json({ error: { code: 'not_found', message: 'Avatar not found' } }, 404)
  }

  const bytes = get_user_avatar(email)
  if (!bytes) {
    return c.json({ error: { code: 'not_found', message: 'Avatar not found' } }, 404)
  }

  const body = Uint8Array.from(bytes).buffer
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'private, no-cache'
    }
  })
}

export const listUsers = async (c: AuthContext) => {
  try {
    return c.json({ data: list_user_identities() })
  } catch (e) {
    console.error('[users.list] Error:', e)
    return c.json(
      {
        error: {
          code: 'internal_error',
          message: 'Erreur lors de la lecture des utilisateurs.'
        }
      },
      500
    )
  }
}

export const account = new Hono<AuthEnv>()

account.get('/users', authenticate, listUsers)
account.get('/me', authenticate, getMe)
account.patch('/me/preferences', authenticate, patchPreferences)
account.post(
  '/me/avatar',
  authenticate,
  bodyLimit({
    maxSize: AVATAR_MAX_UPLOAD_BYTES + 64 * 1024,
    onError: (c) =>
      c.json({ error: { code: 'avatar_too_large', message: 'Avatar upload is too large' } }, 413)
  }),
  postAvatar
)
account.get('/avatars/:email', authenticate, getAvatar)
