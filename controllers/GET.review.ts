import type { Context } from 'hono'
import _ from 'lodash'
import { view } from '../views/review'

import { Conversation } from '../utils/_schema'
import { get_conversation, get_conversations } from '../utils/run-telemetry'

export const controller = async (c: Context) => {
  let displayed_conversation = Conversation.parse([])
  const id = c.req.query('id') as string
  if (id !== null) displayed_conversation = get_conversation(id)

  const conversations: Conversation[] = get_conversations()
  const conversations_grouped_by_id = _.values(_.groupBy(conversations, 'id'))

  return c.html(view(conversations_grouped_by_id, displayed_conversation))
}
