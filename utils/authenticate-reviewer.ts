import type { Context, Next } from 'hono'
import { getSignedCookie } from 'hono/cookie'

export const authenticate = async (c: Context, next: Next) => {
  const cookie = await getSignedCookie(c, Bun.env.AUTH_SECRET as string, 'pierre')
  if (cookie === undefined) c.set('is_auth', false)
  else c.set('is_auth', true)
  await next()
}
