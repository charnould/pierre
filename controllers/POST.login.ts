import { readdir } from 'node:fs/promises'
import type { Context } from 'hono'
import { deleteCookie, setSignedCookie } from 'hono/cookie'
import { User } from '../utils/_schema'
import { encrypt } from '../utils/authenticate-user'
import { get_user, save_user } from '../utils/handle-user'

/**
 * Handles the login and logout actions for the application.
 *
 * @param c - The context object containing the request and response.
 *
 * ### Login Action
 * - Parses the request body to extract `email`, `password`, and `action`.
 * - If the `action` is `login`:
 *   - Special Case: If the email is `admin@pierre-ia.org`:
 *     - Verifies the password against the environment variable `AUTH_PASSWORD`.
 *     - If valid, creates and updates the default administrator user.
 *     - If invalid, redirects to the login page with a `wrong_root_password` error message.
 *   - For other emails:
 *     - Attempts to retrieve the user by email.
 *     - If the user does not exist, redirects to the login page with an `unknown_user` error message.
 *     - If the user exists but the password is incorrect, redirects to the login page with a `wrong_password` error message.
 *     - If the email and password are correct:
 *       - Adjusts the redirection URL if the user's role is `collaborator`.
 *       - Sets a signed authentication cookie to maintain the user's session.
 *       - Redirects to the intended page after successful login.
 *
 * ### Logout Action
 * - If the `action` is `logout`:
 *   - Deletes the authentication cookie.
 *   - Redirects to the login page.
 *
 * ### Authentication Cookie
 * - The cookie is signed and encrypted using the `AUTH_SECRET` environment variable.
 * - The cookie contains the user's email, configuration, and role.
 * - The cookie has a 1-year expiration time.
 *
 * @returns Redirects the user to the appropriate page based on the action and authentication status.
 */
export const controller = async (c: Context) => {
  // Initialize redirection URL (default: '/a' if no redirection is provided)
  let redirection = encodeURIComponent(c.req.query('redirection') ?? '/a')

  // Parse the incoming request body for 'email', 'password', and 'action'
  const { email, password, action }: { email: string; password: string; action: string } =
    await c.req.parseBody()

  // Handle `login` action
  if (action === 'login') {
    // Special case for handling the creation of the default admin user
    // If the provided credentials match the hardcoded 'admin@pierre-ia.org',
    // the first user is created and saved. If the password is incorrect, an error message is shown.
    if (email === 'admin@pierre-ia.org') {
      if (password === Bun.env.AUTH_PASSWORD) {
        const default_user = User.parse({
          role: 'administrator',
          config: JSON.stringify((await readdir('assets')).sort()),
          email: 'admin@pierre-ia.org',
          password_hash: await Bun.password.hash(password)
        })

        await save_user(default_user)
      } else {
        return c.redirect(`/a/login?message=wrong_root_password&redirection=${redirection}`)
      }
    }

    // For other emails,
    // attempt to retrieve the user by email
    const user = await get_user(email)

    // If the user does not exist,
    // redirect to login page with an 'unknown_user' error message
    if (!user) {
      return c.redirect(`/a/login?message=unknown_user&redirection=${redirection}`)
    }

    // If user exists,
    // verify the password provided by the user
    const is_verified = await Bun.password.verify(password, user.password_hash)

    // If password verification fails,
    // redirect to login page with a 'wrong_password' error message
    if (user && is_verified === false) {
      return c.redirect(`/a/login?message=wrong_password&redirection=${redirection}`)
    }

    // If the email and password are correct, check the user’s role
    // If the role is 'collaborator', adjust the redirection URL
    if (user.role === 'collaborator')
      redirection =
        redirection === encodeURIComponent('/a') ? encodeURIComponent('/c') : redirection

    // Set a signed authentication cookie to maintain the user's session
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
      Bun.env.AUTH_SECRET as string,
      { maxAge: 3600 * 24 * 365 } // 1-year expiration
    )

    // If code reaches this point: it means that everything is OK and set
    // Then redirect to the intended page after successful login
    return c.redirect(decodeURIComponent(redirection))
  }

  // Handle `logout` action
  if (action === 'logout') {
    deleteCookie(c, 'pierre-ia')
    return c.redirect('/a/login')
  }
}
