import type { Context } from 'hono'
import { delete_conversation, score } from '../utils/handle-conversation'

export const controller = async (c: Context) => {
  const body = await c.req.parseBody()
  const id = c.req.query('id') as string

  if (body.deletion === 'true') {
    await delete_conversation(id)
  } else {
    await score({
      conv_id: id,
      scorer: body.scorer,
      score: Number(body.score),
      comment: body.comment
    })
  }

  return c.redirect('/a/conversations')
}
