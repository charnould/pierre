import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import type { Context } from 'hono'
import { deleteCookie, setSignedCookie } from 'hono/cookie'

import { BUSINESS_MODULE_IDS } from '../../../../shared/modules'
import { User } from '../../../utils/_schema'
import { encrypt } from '../../../utils/authenticate-user'
import { getUser, saveUser } from '../../../utils/handle-user'
import { CUSTOMIZATION_DIR } from '../../../utils/paths'

export type LoginMessage = 'wrong_password' | 'wrong_root_password' | 'unknown_user'

function wantsJson(c: Context): boolean {
  if (c.req.query('client') === 'desktop') return true
  if (c.req.header('X-Pierre-Client') === 'desktop') return true
  const accept = c.req.header('Accept') ?? c.req.header('accept') ?? ''
  return accept.includes('application/json')
}

async function setAuthCookieForUser(c: Context, user: User) {
  await setSignedCookie(
    c,
    'pierre-ia',
    await encrypt(JSON.stringify({ email: user.email }), Bun.env['AUTH_SECRET'] as string),
    Bun.env['AUTH_SECRET'] as string,
    { maxAge: 3600 * 24 * 365 }
  )
}

/**
 * Handles the login and logout actions for the application.
 *
 * Web form: redirects + ?message= on errors.
 * Native (Accept: application/json): { ok, user?, message? } without redirects.
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
    const normalizedEmail = email.trim().toLowerCase()
    if (normalizedEmail === 'admin@pierre-ia.org' && !(await getUser(normalizedEmail))) {
      if (password !== Bun.env['AUTH_PASSWORD']) {
        if (json)
          return c.json({ ok: false, message: 'wrong_root_password' satisfies LoginMessage }, 401)
        return c.redirect(`/a/login?message=wrong_root_password&redirection=${redirection}`)
      }
      const defaultUser = User.parse({
        email: normalizedEmail,
        isAdministrator: true,
        moduleIds: BUSINESS_MODULE_IDS,
        chatbotIds: (await readdir(join(CUSTOMIZATION_DIR, 'chatbots')))
          .filter((entry) => existsSync(join(CUSTOMIZATION_DIR, 'chatbots', entry, 'config.ts')))
          .sort(),
        passwordHash: await Bun.password.hash(password)
      })
      await saveUser(defaultUser)
    }

    const user = await getUser(normalizedEmail)

    if (!user) {
      if (json) return c.json({ ok: false, message: 'unknown_user' satisfies LoginMessage }, 401)
      return c.redirect(`/a/login?message=unknown_user&redirection=${redirection}`)
    }

    const is_verified = await Bun.password.verify(password, user.passwordHash)

    if (is_verified === false) {
      if (json) return c.json({ ok: false, message: 'wrong_password' satisfies LoginMessage }, 401)
      return c.redirect(`/a/login?message=wrong_password&redirection=${redirection}`)
    }

    if (!user.isAdministrator)
      redirection =
        redirection === encodeURIComponent('/a') ? encodeURIComponent('/c') : redirection

    await setAuthCookieForUser(c, user)

    if (json)
      return c.json({
        ok: true,
        user: {
          email: user.email,
          isAdministrator: user.isAdministrator,
          moduleIds: user.moduleIds,
          chatbotIds: user.chatbotIds
        }
      })
    return c.redirect(decodeURIComponent(redirection))
  }
}
