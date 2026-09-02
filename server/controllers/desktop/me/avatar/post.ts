import type { Context } from 'hono'

import type { Parsed_User } from '../../../../utils/_schema'
import { AVATAR_MAX_UPLOAD_BYTES, encode_user_avatar } from '../../../../utils/avatar-image'
import { resolve_display_name } from '../../../../utils/avatar-preferences'
import { set_user_avatar } from '../../../../utils/user-avatars'

const AVATAR_FIELD = 'avatar'
const MAX_CONCURRENT_AVATAR_ENCODINGS = 2
let activeAvatarEncodings = 0

/**
 * POST /desktop/me/avatar
 *
 * Uploads the current user's photo. Server re-encodes to 256² WebP.
 */
export const controller = async (c: Context) => {
  const user = c.get('user') as Parsed_User | null
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }

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
