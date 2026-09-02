import type { Context } from 'hono'

import { list_user_identities } from '../../../utils/user-avatars'

/**
 * GET /desktop/users
 *
 * Lists org users with avatar presence and display name — never password_hash or blob.
 */
export const controller = async (c: Context) => {
  try {
    return c.json({ users: list_user_identities() })
  } catch (e) {
    console.error('[get.desktop.users] Error:', e)
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
