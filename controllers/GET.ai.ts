import type { CoreTool, StreamTextResult } from 'ai'
import type { Context } from 'hono'
import { streamText } from 'hono/streaming'
import { AIContext, type SMS } from '../utils/_schema'
import { enhance_query } from '../utils/enhance-query'
import { answer_user, reach_deadlock } from '../utils/generate-answer'
import { get_conversation, save_reply } from '../utils/handle-conversation'
import { parse_incoming_sms } from '../utils/parse-incoming-sms'
import { rank_chunks } from '../utils/rank-chunks'
import { vector_search } from '../utils/search-by-vectors'
import { send_sms } from '../utils/send-sms'

export const controller = async (c: Context) => {
  try {
    //
    // Set variables + TS types
    let is_sms = false
    let parsed_sms: SMS = null
    let context: AIContext | undefined
    let answer: StreamTextResult<Record<string, CoreTool>> | string = ''

    //
    // Step 1.
    // Check if incoming request is a valid SMS
    if (c.req.path === '/sms') {
      const json = await c.req.json()
      parsed_sms = await parse_incoming_sms(json)
      if (parsed_sms === null) is_sms = false
      else is_sms = true
    }

    //
    // Step 2
    //
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

    //
    // Step 3.
    // Apply all IA and retrieval logic...!
    if (context) {
      //
      // 1. Save user query in DB
      // 2. Get the ALL conversation and assign it
      // 3. Parse and enhance user query
      save_reply(context, true)
      context.conversation = get_conversation(context.conv_id)
      context = await AIContext.parseAsync({ ...context, ...(await enhance_query(context)) })

      // If query/request is not good, prepare a deadlock answer
      if (
        (context.is_about_housing === false && context.is_about_yourself === true) ||
        (context.is_about_housing === false && context.is_greeting === true) ||
        context.is_about_housing === false ||
        context.contains_profanity === true
      ) {
        answer = await reach_deadlock(context, { is_sms: is_sms })
      } else {
        //
        // If query/request is good,
        // retrieve the best possible chunks...
        const chunks = await Promise.all([
          vector_search(context.content),
          vector_search(context.stepback),
          vector_search((context.hyde as string[])[0]),
          vector_search((context.hyde as string[])[1]),
          vector_search((context.hyde as string[])[2]),
          vector_search((context.queries as string[])[0]),
          vector_search((context.queries as string[])[1]),
          vector_search((context.queries as string[])[2])
        ])

        // Deduplicate and rank them
        context.chunks = rank_chunks(chunks)

        // Finally, generate the answer
        answer = await answer_user(context, { is_sms: is_sms })
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
      console.log(answer)
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
