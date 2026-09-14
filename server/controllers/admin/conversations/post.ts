import type { Context } from 'hono'

import { delete_conversation, score_conversation } from '../../../utils/handle-conversation'

export const controller = async (c: Context) => {
  const body = await c.req.parseBody()
  const id = c.req.query('id') as string

  if (body['deletion'] === 'true') {
    await delete_conversation(id)
  } else {
    const scorer = body['scorer']
    const score = Number(body['score'])
    const comment = body['comment']
    if (
      (scorer !== 'organization' && scorer !== 'customer' && scorer !== 'ai') ||
      !Number.isFinite(score) ||
      typeof comment !== 'string'
    ) {
      return c.text('Invalid score', 400)
    }
    await score_conversation({
      conv_id: id,
      scorer,
      score,
      comment
    })
  }

  return c.redirect('/a/conversations')
}
