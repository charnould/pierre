import type { Context } from 'hono'
import { view } from '../views/login'

export const controller = async (c: Context) => {
  const message = c.req.query('message')
  return c.html(view(message))
}
