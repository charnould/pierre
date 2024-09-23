import type { Context } from 'hono'
import { deleteCookie, setSignedCookie } from 'hono/cookie'

export const controller = async (c: Context) => {
  const { password, action } = await c.req.parseBody()

  if (action === 'login') {
    const passwords = Bun.env.PASSWORDS?.split(',')
    const is_legit = passwords?.includes(password as string)

    if (is_legit === true) {
      await setSignedCookie(c, 'pierre', 'is_auth', Bun.env.AUTH_SECRET as string)
    }
  }

  if (action === 'logout') {
    deleteCookie(c, 'pierre')
  }

  return c.redirect('/eval/chats')
}
