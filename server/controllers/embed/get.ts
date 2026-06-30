import type { Context } from 'hono'

import { view } from '../../views/embed.index'

export const controller = (c: Context) => {
  const config = c.req.query('config') ?? 'default'
  return c.html(view({ config }))
}
