import type { Context } from 'hono'
import { deleteCookie, setSignedCookie } from 'hono/cookie'
import { User } from '../utils/_schema'
import { encrypt } from '../utils/authenticate-user'
import { get_user, save_user } from '../utils/handle-user'

export const controller = async (c: Context) => {
  // Parse request body and initialize variables
  const redirection = encodeURIComponent(c.req.query('redirection') ?? '/a')

  const { email, password, action }: { email: string; password: string; action: string } =
    await c.req.parseBody()

  // Handle `login` action
  // Check credentials, then redirect accordingly
  if (action === 'login') {
    // Special case for handling the very first user
    // Create and save the default admin user if credentials match
    // Otherwise redirect and display an error message
    if (email === 'admin@pierre-ia.org') {
      if (password === Bun.env.AUTH_PASSWORD) {
        const default_user = User.parse({
          role: 'administrator',
          config: 'pierre-ia.org',
          email: 'admin@pierre-ia.org',
          password_hash: await Bun.password.hash(password)
        })

        save_user(default_user)
      } else {
        return c.redirect(`/a/login?message=wrong_root_password&redirection=${redirection}`)
      }
    }

    // If email isn't `admin@pierre-ia.org`,
    // try to retrieve user by email
    const user = get_user(email.toLowerCase()) as User

    // Redirect if the user does not exist
    if (!user) {
      return c.redirect(`/a/login?message=unknown_user&redirection=${redirection}`)
    }

    // If user exists, verify password
    const is_verified = await Bun.password.verify(password, user.password_hash)

    // Redirect if password verification fails
    if (user && is_verified === false) {
      return c.redirect(`/a/login?message=wrong_password&redirection=${redirection}`)
    }

    // If both `email` and `password` are correct,
    // set a signed authentication cookie for user session
    await setSignedCookie(
      c,
      'pierre-ia',
      encrypt(
        JSON.stringify({ email: user.email, config: user.config, role: user.role }),
        Bun.env.AUTH_SECRET as string
      ),
      Bun.env.AUTH_SECRET as string,
      { maxAge: 3600 * 24 * 365 } // 1-year expiration
    )

    // If code reaches this point: it means that everything is OK and set
    // Then redirect to the intended page after successful login
    return c.redirect(decodeURIComponent(redirection))
  }

  // Handle `logout` action
  // Delete cookies, then redirect to login page
  if (action === 'logout') {
    deleteCookie(c, 'pierre-ia')
    return c.redirect('/a/login')
  }
}
