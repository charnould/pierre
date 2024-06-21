import type { Context } from 'hono'

export const controller = async (c: Context) => {
  // Always return 200 OK.
  // Client doesn't care if backend works or not
  return c.body('OK', 201, { 'Content-Type': 'text/plain' })
}
