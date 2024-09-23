import type { Context } from 'hono'
import _ from 'lodash'
import { view } from '../views/chats'

import type { Reply } from '../utils/_schema'
import { get_conversation, get_conversations_for_review } from '../utils/handle-conversation'

export const controller = async (c: Context) => {
  const is_auth = c.get('is_auth')

  let displayed_conversation: Reply[]
  const id = c.req.query('id') as string
  if (id !== null) displayed_conversation = get_conversation(id)

  const conversations: Reply[] = get_conversations_for_review()
  const conversations_grouped_by_id = _.map(_.groupBy(conversations, 'id'), (group) =>
    _.reverse(group)
  )

  return c.html(view(is_auth, conversations_grouped_by_id, displayed_conversation))
}
