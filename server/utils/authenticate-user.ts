import type { Context, Next } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'

import { getUser } from '../utils/handle-user'
import type { Config, User } from './_schema'
import { getAuth } from './auth'
import { ChatbotConfigError, loadChatbotConfig } from './chatbot-config'

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

export const authenticateChat = async (c: Context, next: Next) => {
  const user = await readSessionUser(c)
  c.set('user', user)

  const requestedConfig = c.req.query('config')
  let config: Config | null = null
  let configError: ChatbotConfigError | null = null
  if (requestedConfig === undefined) {
    config = await loadChatbotConfig('default')
  } else {
    try {
      config = await loadChatbotConfig(requestedConfig)
    } catch (error) {
      if (error instanceof ChatbotConfigError) configError = error
      else throw error
    }
  }

  const data_query =
    c.req.query('data') === 'undefined' || c.req.query('data') === undefined
      ? ''
      : c.req.query('data')

  if (requestedConfig === undefined) {
    return c.redirect(`/c?config=default&data=${data_query}`)
  }

  if (!config || configError) {
    return c.html('<p>Configuration introuvable.</p>', 404)
  }

  if (user !== null && config.protected && !user.chatbotIds.includes(config.id)) {
    return c.html('<p>Accès refusé.</p>', 403)
  }

  if (c.req.query('data') === undefined || c.req.query('data') === 'undefined') {
    return c.redirect(`/c?config=${config.id}&data=${data_query}`)
  }

  if (config.protected && user === null) {
    const redirect = `/c?${new URLSearchParams({ config: config.id, data: data_query ?? '' })}`
    return c.redirect(`/login?redirect=${encodeURIComponent(redirect)}`)
  }

  return await next()
}
