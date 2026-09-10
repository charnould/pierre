import type { Context } from 'hono'

export const controller = (c: Context) =>
  c.json(
    {
      error: {
        code: 'not_a_channel',
        message: 'La signature n’est pas un canal de communication'
      }
    },
    501
  )
