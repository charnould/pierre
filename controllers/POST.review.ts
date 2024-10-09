import type { Context } from 'hono'
import { delete_conversation, score_conversation } from '../utils/handle-conversation'

export const controller = async (c: Context) => {
  const body = await c.req.parseBody()
  const id = c.req.query('id') as string

  if (body.deletion === 'true') {
    delete_conversation(id)
  } else {
    score_conversation(
      {
        conv_id: id,
        scorer: body.scorer,
        score: body.score,
        comment: body.comment
      },
      true
    )
  }

  return c.redirect('/eval/chats')
}
