import type { Context, Next } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'

import { getUser } from '../utils/handle-user'
import type { User } from './_schema'
import { getAuth } from './auth'

const CLI_ADMIN: User = {
  email: 'cli@pierre.local',
  isAdministrator: true,
  moduleIds: [],
  chatbotIds: []
}

const readSessionUser = async (c: Context): Promise<User | null> => {
  try {
    const { headers, response: session } = await getAuth().api.getSession({
      headers: c.req.raw.headers,
      returnHeaders: true
    })
    for (const cookie of headers.getSetCookie()) {
      c.header('Set-Cookie', cookie, { append: true })
    }
    if (!session) return null
    return (await getUser(session.user.email)) ?? null
  } catch {
    return null
  }
}

export const authenticateAdministratorApi = async (c: Context, next: Next) => {
  if (c.req.header('authorization')?.startsWith('Bearer ')) {
    return await bearerAuth({ token: Bun.env['AUTH_BEARER']! })(c, async () => {
      c.set('user', CLI_ADMIN)
      return next()
    })
  }
  const user = await readSessionUser(c)
  if (user === null) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }
  c.set('user', user)
  return next()
}

export const authenticate = async (c: Context, next: Next) => {
  const user = await readSessionUser(c)
  if (user === null) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }
  c.set('user', user)
  return next()
}

export const authenticateOptional = async (c: Context, next: Next) => {
  c.set('user', await readSessionUser(c))
  return next()
}
