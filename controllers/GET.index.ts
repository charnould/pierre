import type { Context } from 'hono'
import { z } from 'zod'
import type { Config } from '../utils/_schema'
import { view } from '../views/index'

export const controller = async (c: Context) => {
  try {
    const config: Config = (await import(`../assets/${c.req.query('config')}/config`)).default
    z.string().uuid().parse(c.req.param('id'))
    return c.html(view(config))
  } catch (e) {
    console.log(e)
    return c.notFound()
  }
}
