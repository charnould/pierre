import type { CoreTool, StreamTextResult } from 'ai'
import type { Context } from 'hono'
import { streamText } from 'hono/streaming'
import { AIContext, type Config, type SMS } from '../utils/_schema'
import { augment_query } from '../utils/augment-query'
import { answer_user, reach_deadlock } from '../utils/generate-answer'
import { get_conversation, save_reply } from '../utils/handle-conversation'
import { parse_incoming_sms } from '../utils/parse-incoming-sms'
import { rank_chunks } from '../utils/rank-chunks'
import { vector_search } from '../utils/search-by-vectors'
import { send_sms } from '../utils/send-sms'

export const controller = async (c: Context) => {
  try {
    // Step 1. Set variables and types
    let is_sms = false
    let parsed_sms: SMS = null
    let context: AIContext
    let answer: string | StreamTextResult<Record<string, CoreTool>>

    // Step 2. Check if incoming request is a valid SMS
    if (c.req.path === '/sms') {
      parsed_sms = await parse_incoming_sms(await c.req.json())
      if (parsed_sms !== null) is_sms = true
    }

    // Step 3. Create/parse an answer context
    if (is_sms) {
      context = await AIContext.parseAsync(parsed_sms)
    } else {
      context = await AIContext.parseAsync({
        role: 'user',
        conv_id: c.req.param('id'),
        config: c.req.query('config'),
        content: c.req.query('message')
      })
    }

    // Step 4. Apply AI logic

    save_reply(context, true)

    context = await AIContext.parseAsync({
      ...context,
      conversation: get_conversation(context.conv_id)
    }).then(async (context) => ({ ...context, query: await augment_query(context) }))

    // If query is relevant and does not contain profanity, answer with intelligence
    if (context.query?.is_relevant && !context.query.contains_profanity) {
      console.debug('🤖 should answer with intelligence')

      const chunks = await Promise.all(
        [
          ...context.query.standalone_questions,
          ...context.query.stepback_questions,
          ...context.query.search_queries,
          ...context.query.hyde_answers
        ].map((q) => vector_search(q))
      )

      context.chunks = rank_chunks(chunks)

      console.debug('🤖 augments the user query to:\n', context)

      answer = (await answer_user(context, { is_sms: is_sms })) as
        | string
        | StreamTextResult<Record<string, CoreTool>>
    } else {
      // If query is irrelevant and/or contains profanity, make a deadlock answer
      console.debug('🤖 should answer with a deadlock')

      answer = (await reach_deadlock(context, { is_sms: is_sms })) as
        | string
        | StreamTextResult<Record<string, CoreTool>>
    }

    // Step 5. Send answer to the user

    // If incoming request is a SMS, return a full-text answer
    if (is_sms && parsed_sms !== null) {
      await send_sms({
        from: (context.config as Config).phone,
        to: parsed_sms.to,
        message: answer
      })

      return c.body('ok', 200)
    }

    // If incoming request comes from the WWW, return a text stream

    // TODO: optimize stream (see. Hono/Vercel SDK Core)
    return streamText(c, async (stream) => {
      c.header('Content-Type', 'text/event-stream')

      for await (const textPart of answer.textStream) {
        await stream.write(`data: ${textPart.replace(/\n/g, '<br/>')}\n\n` ?? '')
      }

      await stream.write('data: pierre_event_stream_closed\n\n')
    })
  } catch (e) {
    console.error(e)
  }
}
