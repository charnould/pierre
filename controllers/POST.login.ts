import type { Context } from 'hono'
import { deleteCookie, setSignedCookie } from 'hono/cookie'
import { User } from '../utils/_schema'
import { encrypt } from '../utils/authenticate-user'
import { get_user, save_user } from '../utils/handle-user'

export const controller = async (c: Context) => {
  // Prepare variables
  const { email, password, action }: { email: string; password: string; action: string } =
    await c.req.parseBody()

  // If login: check credentials + redirect accordingly
  if (action === 'login') {
    // Special case
    if (email === 'admin@pierre-ia.org') {
      if (password === Bun.env.AUTH_PASSWORD) {
        const default_user = User.parse({
          config: 'pierre-ia.org',
          email: 'admin@pierre-ia.org',
          password_hash: await Bun.password.hash(password),
          role: 'administrator'
        })

        save_user(default_user)
      }

      if (password !== Bun.env.AUTH_PASSWORD) {
        return c.redirect('/a/login?message=wrong_root_password')
      }
    }

    const user = get_user(email.toLowerCase()) as User

    if (user === undefined) {
      return c.redirect('/a/login?message=unknown_user')
    }

    const is_verified = await Bun.password.verify(password, user.password_hash)

    if (user && is_verified === false) {
      return c.redirect('/a/login?message=wrong_password')
    }

    await setSignedCookie(
      c,
      'pierre-ia',
      encrypt(
        JSON.stringify({
          email: user.email,
          config: user.config,
          role: user.role
        }),
        Bun.env.AUTH_SECRET as string
      ),
      Bun.env.AUTH_SECRET as string
    )

    return c.redirect('/a')
  }

  // If logout: delete cookies + redirect to login page
  if (action === 'logout') {
    deleteCookie(c, 'pierre-ia')
    return c.redirect('/a/login')
  }
}
