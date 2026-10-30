import type { Context } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { createMiddleware } from 'hono/factory'

import { getUser } from '../utils/handle-user'
import type { User } from './_schema'
import { getAuth } from './auth'

export type AppEnv = { Variables: { user: User | null } }
export type AuthEnv = { Variables: { user: User } }
export type AppContext = Context<AppEnv>
export type AuthContext = Context<AuthEnv>

const CLI_ADMIN: User = {
  email: 'cli@pierre.local',
  isAdministrator: true,
  moduleIds: [],
  chatbotIds: []
}

const readSessionUser = async (c: Context): Promise<User | null> => {
  const { headers, response: session } = await getAuth().api.getSession({
    headers: c.req.raw.headers,
    returnHeaders: true
  })
  for (const cookie of headers.getSetCookie()) {
    c.header('Set-Cookie', cookie, { append: true })
  }
  if (!session) return null
  return (await getUser(session.user.email)) ?? null
}

export const authenticateAdministratorApi = createMiddleware<AuthEnv>(async (c, next) => {
  if (c.req.header('authorization')?.startsWith('Bearer ')) {
    const token = Bun.env['AUTH_BEARER']
    if (!token) {
      return c.json({ error: { code: 'misconfigured', message: 'AUTH_BEARER is required' } }, 503)
    }
    return await bearerAuth<AuthEnv>({ token })(c, async () => {
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
})

export const authenticate = createMiddleware<AuthEnv>(async (c, next) => {
  const user = await readSessionUser(c)
  if (user === null) {
    return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
  }
  c.set('user', user)
  return next()
})

export const authenticateOptional = createMiddleware<AppEnv>(async (c, next) => {
  c.set('user', await readSessionUser(c))
  return next()
})
