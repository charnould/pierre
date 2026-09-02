import type { Context } from 'hono'

import type { Parsed_User } from '../../../../utils/_schema'
import { patch_me_preferences } from '../../../../utils/avatar-preferences'

/**
 * PATCH /desktop/me/preferences
 *
 * Updates the authenticated user's display_name, or clears the photo (avatar: null).
 */
export const controller = async (c: Context) => {
  const user = c.get('user') as Parsed_User | null
  if (!user?.email) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid JSON body' } }, 400)
  }

  if (!body || typeof body !== 'object') {
    return c.json({ error: { code: 'invalid_body', message: 'Invalid JSON body' } }, 400)
  }

  const result = patch_me_preferences(user.email, body as Record<string, unknown>)
  if ('error' in result) {
    return c.json({ error: { code: 'invalid_body', message: result.error } }, 400)
  }

  return c.json({ data: result })
}
