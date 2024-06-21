import type { Context } from 'hono'
import { z } from 'zod'
import clients from '../config/pierre'
import { view } from '../views/index'

export const controller = async (c: Context) => {
  const config_id = c.req.query('config')
  const config = clients.config.find((c) => c.config === config_id)
  const is_uuid = z.string().uuid().safeParse(c.req.param('id')).success

  if (is_uuid === false || config_id === undefined || config === undefined) return c.notFound()

  return c.html(view(config))
}
