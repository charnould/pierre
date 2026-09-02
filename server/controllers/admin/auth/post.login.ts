import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import type { Context } from 'hono'
import { deleteCookie, setSignedCookie } from 'hono/cookie'

import { User } from '../../../utils/_schema'
import type { Parsed_User } from '../../../utils/_schema'
import { encrypt } from '../../../utils/authenticate-user'
import { get_user, save_user } from '../../../utils/handle-user'
import { CUSTOMIZATION_DIR } from '../../../utils/paths'

export type LoginMessage = 'wrong_password' | 'wrong_root_password' | 'unknown_user'

function wantsJson(c: Context): boolean {
  if (c.req.query('client') === 'desktop') return true
  if (c.req.header('X-Pierre-Client') === 'desktop') return true
  const accept = c.req.header('Accept') ?? c.req.header('accept') ?? ''
  return accept.includes('application/json')
}

async function setAuthCookieForUser(c: Context, user: Parsed_User) {
  await setSignedCookie(
    c,
    'pierre-ia',
    encrypt(
      JSON.stringify({
        email: user.email,
        config: user.config,
        role: user.role
      }),
      Bun.env['AUTH_SECRET'] as string
    ),
    Bun.env['AUTH_SECRET'] as string,
    { maxAge: 3600 * 24 * 365 }
  )
}

/**
 * Handles the login and logout actions for the application.
 *
 * Web form: redirects + ?message= on errors.
 * Native (Accept: application/json): { ok, message? } without redirects.
 */
export const controller = async (c: Context) => {
  let redirection = encodeURIComponent(c.req.query('redirection') ?? '/a')
  const json = wantsJson(c)

  const { email, password, action }: { email: string; password: string; action: string } =
    await c.req.parseBody()

  if (action === 'logout') {
    deleteCookie(c, 'pierre-ia')
    if (json) return c.json({ ok: true })
    return c.redirect('/a/login')
  }

  if (action === 'login') {
    if (email === 'admin@pierre-ia.org') {
      if (password === Bun.env['AUTH_PASSWORD']) {
        const default_user = User.parse({
          role: 'administrator',
          config: JSON.stringify(
            (await readdir(join(CUSTOMIZATION_DIR, 'chatbots')))
              .filter((entry) =>
                existsSync(join(CUSTOMIZATION_DIR, 'chatbots', entry, 'config.ts'))
              )
              .sort()
          ),
          email: 'admin@pierre-ia.org',
          password_hash: await Bun.password.hash(password)
        })

        await save_user(default_user)
      } else {
        if (json)
          return c.json({ ok: false, message: 'wrong_root_password' satisfies LoginMessage }, 401)
        return c.redirect(`/a/login?message=wrong_root_password&redirection=${redirection}`)
      }
    }

    const user = await get_user(email)

    if (!user) {
      if (json) return c.json({ ok: false, message: 'unknown_user' satisfies LoginMessage }, 401)
      return c.redirect(`/a/login?message=unknown_user&redirection=${redirection}`)
    }

    const is_verified = await Bun.password.verify(password, user.password_hash)

    if (is_verified === false) {
      if (json) return c.json({ ok: false, message: 'wrong_password' satisfies LoginMessage }, 401)
      return c.redirect(`/a/login?message=wrong_password&redirection=${redirection}`)
    }

    if (user.role === 'collaborator')
      redirection =
        redirection === encodeURIComponent('/a') ? encodeURIComponent('/c') : redirection

    await setAuthCookieForUser(c, user)

    if (json) return c.json({ ok: true })
    return c.redirect(decodeURIComponent(redirection))
  }
}
