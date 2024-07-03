import type { Context } from 'hono'

export const controller = async (c: Context) => {
  return c.body(null, 200)
}
