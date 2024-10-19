import type { Context } from 'hono'
import { save_reply, score_conversation } from '../utils/handle-conversation'

export const controller = async (c: Context) => {
  try {
    const data = await c.req.json()
    if (data.scorer) {
      score_conversation(data, false)
    } else {
      await save_reply(data, false)
    }
  } catch {}

  return c.body(null, 200)
}
