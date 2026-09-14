import type { Context } from 'hono'
import _ from 'lodash'

import {
  get_conversation,
  get_conversations,
  type StoredReply
} from '../../../utils/handle-conversation'
import { view } from '../../../views/admin.conversations'

export const controller = async (c: Context) => {
  try {
    // Retrieve and display the conversation matching the `id` from the query string.
    // `String(id)` ensures the value is treated as a string, even if it's undefined.
    const id = c.req.query('id')
    const displayed_conversation = await get_conversation(String(id))

    const conversations = await get_conversations()
    const conversations_grouped_by_id = _.map(_.groupBy(conversations, 'conv_id'), (group) =>
      _.reverse(group)
    )

    return c.html(
      view(
        conversations_grouped_by_id as Array<[StoredReply, ...StoredReply[]]>,
        displayed_conversation
      )
    )
  } catch (e) {
    console.error(e)
  }
}
