import { randomUUIDv7 } from 'bun'
import type { Context } from 'hono'
import { z } from 'zod'
import type { Config } from '../utils/_schema'
import { view } from '../views/index'

export const controller = async (c: Context) => {
  try {
    const config: Config = (await import(`../assets/${c.req.query('config')}/config`)).default

    const has_valid_uuid = z.string().uuid().safeParse(c.req.param('id')).success
    const context_query = c.req.query('context')
    const has_valid_context = context_query ? Boolean(config.context[context_query]) : false

    if (has_valid_uuid && has_valid_context) {
      return c.html(view(config, context_query as string))
    }
    const context = has_valid_context ? context_query : 'default'
    return c.redirect(`/c/${randomUUIDv7()}?config=${config.id}&context=${context}`)
  } catch {
    return c.redirect(`/c/${randomUUIDv7()}?config=pierre-ia.org`)
  }
}
