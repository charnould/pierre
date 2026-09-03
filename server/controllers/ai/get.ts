import type { Context } from 'hono'

import { AIContext } from '../../utils/_schema'
import { streamChatRequest, streamChatRequestError } from '../../utils/stream-chat-request'

/**
 * Controller for NDJSON streaming with Copilot SDK.
 *
 * Streams response events to the frontend as newline-delimited JSON.
 */
export const controller = async (c: Context) => {
  try {
    // Parse context from request
    const dataQuery = c.req.query('data')
    const customRaw =
      dataQuery === undefined || dataQuery === 'undefined' ? [''] : dataQuery.split('|')

    const context = await AIContext.parseAsync({
      config: (await import(`../../../customization/chatbots/${c.req.query('config')}/config`))
        .default,
      custom_data: { raw: customRaw },
      metadata: { user: c.get('user')?.email ?? null },
      content: c.req.query('message'),
      conv_id: c.req.query('conv_id'),
      role: 'user'
    })

    return streamChatRequest(c, context)
  } catch (e) {
    return streamChatRequestError(c, e)
  }
}
