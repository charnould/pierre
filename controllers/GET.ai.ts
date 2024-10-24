import type { CoreTool, StreamTextResult } from 'ai'
import type { Context } from 'hono'
import { streamText } from 'hono/streaming'
import { AIContext, type SMS } from '../utils/_schema'
import { augment_query } from '../utils/augment-query'
import { answer_user, reach_deadlock } from '../utils/generate-answer'
import { get_conversation, save_reply } from '../utils/handle-conversation'
import { parse_incoming_sms } from '../utils/parse-incoming-sms'
import { rank_chunks } from '../utils/rank-chunks'
import { vector_search } from '../utils/search-by-vectors'
import { send_sms } from '../utils/send-sms'

export const controller = async (c: Context) => {
  try {
    // Set variables + TS types

    let is_sms = false
    let parsed_sms: SMS = null
    let context: AIContext | undefined
    let answer: string | StreamTextResult<Record<string, CoreTool<any, any>>>

    // Step 1. Check if incoming request is a valid SMS

    if (c.req.path === '/sms') {
      const json = await c.req.json()
      parsed_sms = await parse_incoming_sms(json)
      if (parsed_sms === null) is_sms = false
      else is_sms = true
    }

    // Step 2.

    // If incoming conversation comes from a SMS
    if (is_sms === true) context = await AIContext.parseAsync(parsed_sms)

    // If incoming conversation comes from WWW
    if (is_sms === false) {
      context = await AIContext.parseAsync({
        role: 'user',
        conv_id: c.req.param('id'),
        config: c.req.query('config'),
        content: c.req.query('message')
      })
    }

    // Step 3. Apply logic

    if (context) {
      save_reply(context, true)

      context = await AIContext.parseAsync({
        ...context,
        conversation: get_conversation(context.conv_id)
      }).then(async (context) => ({ ...context, query: await augment_query(context) }))

      if (context?.query.is_relevant && !context?.query.contains_profanity) {
        console.debug('🤖 -> IA should answer with intelligence')

        const chunks = await Promise.all(
          [
            ...context.query.standalone_questions,
            ...context.query.stepback_questions,
            ...context.query.search_queries,
            ...context.query.hyde_answers
          ].map((q) => vector_search(q))
        )

        context.chunks = rank_chunks(chunks)

        answer = (await answer_user(context, { is_sms: is_sms })) as
          | string
          | StreamTextResult<Record<string, CoreTool<any, any>>>
      } else {
        if (context != undefined) {
          console.debug('🤖 -> IA should answer with a deadlock')

          answer = (await reach_deadlock(context, { is_sms: is_sms })) as
            | string
            | StreamTextResult<Record<string, CoreTool<any, any>>>
        }
      }
    }

    //
    // If incoming conversation comes from:
    //
    // ███████╗███╗   ███╗███████╗
    // ██╔════╝████╗ ████║██╔════╝
    // ███████╗██╔████╔██║███████╗
    // ╚════██║██║╚██╔╝██║╚════██║
    // ███████║██║ ╚═╝ ██║███████║
    // ╚══════╝╚═╝     ╚═╝╚══════╝
    //
    // return a full-text answer:
    //

    if (is_sms === true) {
      await send_sms({ from: parsed_sms?.phone, to: parsed_sms?.to, message: answer })
      return c.body('ok', 200)
    }

    //
    // If incoming conversation comes from:
    //
    // ██╗    ██╗██╗    ██╗██╗    ██╗
    // ██║    ██║██║    ██║██║    ██║
    // ██║ █╗ ██║██║ █╗ ██║██║ █╗ ██║
    // ██║███╗██║██║███╗██║██║███╗██║
    // ╚███╔███╔╝╚███╔███╔╝╚███╔███╔╝
    //
    // return a stream:
    //

    if (is_sms === false) {
      return streamText(c, async (stream) => {
        c.header('Content-Type', 'text/event-stream')
        for await (const textPart of answer.textStream) {
          await stream.write(`data: ${textPart.replace(/\n/g, '<br/>')}\n\n` ?? '')
        }
        await stream.write('data: pierre_event_stream_closed\n\n')
      })
    }
  } catch (err) {
    console.error(err)
  }
}
