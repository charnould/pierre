import type { Context } from 'hono'
import type { Config } from '../utils/_schema'
import { view } from '../views/index'

export const controller = async (c: Context) => {
  const config: Config = (await import(`../assets/${c.req.query('config')}/config`)).default
  return c.html(view(config))
}
