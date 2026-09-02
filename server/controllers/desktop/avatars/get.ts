import type { Context } from 'hono'

import { parseAvatarEmail } from '../../../../shared/avatar'
import type { Parsed_User } from '../../../utils/_schema'
import { get_user_avatar } from '../../../utils/user-avatars'

/**
 * GET /desktop/avatars/:email
 *
 * Serves the org user's stored WebP. 404 if none.
 */
export const controller = async (c: Context) => {
  const user = c.get('user') as Parsed_User | null
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }

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
