import type { Context, Next } from 'hono'

import type { Parsed_User, User } from './_schema'

const authorize_roles =
  (...allowed: readonly User['role'][]) =>
  async (c: Context, next: Next) => {
    const user = c.get('user') as Parsed_User | null | undefined
    if (!user?.email) {
      return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
    }
    if (!allowed.includes(user.role)) {
      return c.json({ error: { code: 'forbidden', message: 'Insufficient permissions' } }, 403)
    }
    return await next()
  }

export const authorize_mutation = authorize_roles('contributor', 'administrator')
export const authorize_administrator = authorize_roles('administrator')
