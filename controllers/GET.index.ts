import { randomUUIDv7 } from 'bun'
import type { Context } from 'hono'
import { z } from 'zod'
import type { Config } from '../utils/_schema'
import { view } from '../views/index'

export const controller = async (c: Context) => {
  try {
    const config: Config = (await import(`../assets/${c.req.query('config')}/config`)).default

    const has_valid_uuid = z.string().uuid().safeParse(c.req.param('id')).success
    const scenario_query = c.req.query('scenario')
    const has_valid_scenario = scenario_query ? Boolean(config.scenario[scenario_query]) : false

    if (has_valid_uuid && has_valid_scenario) {
      return c.html(view(config, scenario_query as string))
    }
    const scenario = has_valid_scenario ? scenario_query : 'default'
    return c.redirect(`/c/${randomUUIDv7()}?config=${config.id}&scenario=${scenario}`)
  } catch {
    return c.redirect(`/c/${randomUUIDv7()}?config=pierre-ia.org`)
  }
}
