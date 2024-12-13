import type { CoreTool, StreamTextResult } from 'ai'
import type { Context } from 'hono'
import { stream } from 'hono/streaming'
import { AIContext, type Config, type SMS } from '../utils/_schema'
import { augment_query } from '../utils/augment-query'
import {
  answer_collaborator,
  answer_user,
  reach_profanity_deadlock,
  reach_relevancy_deadlock
} from '../utils/generate-answer'
import { get_conversation, save_reply } from '../utils/handle-conversation'
import { parse_incoming_sms } from '../utils/parse-incoming-sms'
import { rank_chunks } from '../utils/rank-chunks'
import { bm25_search } from '../utils/search-by-bm25'
import { vector_search } from '../utils/search-by-vectors'
import { send_sms } from '../utils/send-sms'

export const controller = async (c: Context) => {
  try {
    //
    // Step 1.
    // Set variables and types
    //

    let is_sms = false
    let parsed_sms: SMS = null
    let context: AIContext
    let answer: string | StreamTextResult<Record<string, CoreTool>>

    //
    // Step 2.
    // Check if incoming request is a valid SMS
    // TODO: handle wrong `/sms` request
    //

    if (c.req.path === '/sms') {
      parsed_sms = await parse_incoming_sms(await c.req.json())
      if (parsed_sms !== null) is_sms = true
    }

    //
    // Step 3.
    // Parse and initialize the answer context
    // to prepare it for further processing.
    //

    if (is_sms) {
      context = await AIContext.parseAsync(parsed_sms)
    } else {
      context = await AIContext.parseAsync({
        role: 'user',
        conv_id: c.req.param('id'),
        config: c.req.query('config'),
        content: c.req.query('message'),
        current_context: c.req.query('context')
      })
    }

    //
    // Step 4.
    // The Main Part: "Apply AI Logic"
    //

    // Save reply (= what the user just said) and because
    // of `true` save also this reply to PIERRE (= telemetry)
    // if `telemetry` env. variable is also `true`
    save_reply(context, true)

    // Add up conversation context with full conversation
    // (= everything user/AI have said) and augment+enrich
    // last user input
    context = await AIContext.parseAsync({
      ...context,
      conversation: get_conversation(context.conv_id)
    }).then(async (context) => ({ ...context, query: await augment_query(context) }))

    // If query is relevant and does not contain profanity,
    // answer with intelligence
    if (context.query && !context.query.contains_profanity) {
      //
      //
      //
      console.debug('🤖 should answer with intelligence')
      //
      //
      //

      // Get knowledge access for user query considering current context
      let knowledge_access = { community: true, proprietary: { public: false, private: false } }
      if (typeof context.config !== 'string') {
        knowledge_access = context.config.context[context.current_context].knowledge
      }

      // Get relevant chunks and rerank them.
      // This is here that "intelligence" must occur.
      // If `context.chunks` contains bullshit, PIERRE
      // answer will probably be bullshit!

      console.debug('Vector searches starts')

      const v_results = await Promise.all(
        [
          ...context.query.standalone_questions,
          ...context.query.stepback_questions,
          ...context.query.search_queries,
          ...context.query.hyde_answers
        ].map((q) => vector_search(q, context))
      )

      console.debug('Fulltext searches starts')

      const k_results = context.query.bm25_keywords.map((k) => bm25_search(k, context))

      console.log('Reranking starts')

      context.chunks = await rank_chunks(
        v_results.filter((chunk) => chunk !== undefined), // TODO: vector_search must not return undefined
        k_results.filter((chunk) => chunk !== undefined), // TODO: vector_search must not return undefined
        context
      )

      //
      //
      //
      console.debug('-----------------------------------------')
      console.debug('🤖 augments the user query to:')
      console.debug(context)
      console.debug('-----------------------------------------')
      //
      //
      //

      // If the reranker returns no relevant results, it indicates that
      // either the question is unrelated to housing  or PIERRE lacks
      // the necessary knowledge to address it. In both cases, respond
      // with a deadlock.
      if (
        context.chunks.community.length === 0 &&
        context.chunks.private.length === 0 &&
        context.chunks.public.length === 0
      ) {
        console.debug('🤖 responding with a no-knowledge deadlock.')
        answer = await reach_relevancy_deadlock(context, { is_sms: is_sms })
      }
      // If private knowledge access is `true` (e.g. internal process),
      // it means that user MUST be a collaborator. Hence, answer
      // must be specific to this use case.
      else if (knowledge_access.proprietary.private === true) {
        console.debug('🤖 responding to a collaborator.')
        answer = await answer_collaborator(context, { is_sms: is_sms })
      } else {
        // If private knowledge access is `false`,
        // answer user like a normal user
        console.debug('🤖 responding to a normal user.')
        answer = await answer_user(context, { is_sms: is_sms })
      }
    } else {
      //
      //
      //
      console.debug('🤖 responding with a profanity deadlock')
      //
      //
      //

      // If query is irrelevant and/or contains profanity,
      // make a deadlock answer
      answer = await reach_profanity_deadlock(context, { is_sms: is_sms })
    }

    //
    // Step 5.
    // Send answer to the user
    //

    // If incoming request is a SMS,
    // return a full-text answer
    if (is_sms && parsed_sms !== null) {
      await send_sms({
        from: (context.config as Config).phone,
        to: parsed_sms.to,
        message: answer
      })

      return c.body('ok', 200)
    }

    // If incoming request comes from
    // the web, return a text stream.

    // c.header('Content-Type', 'text/plain; charset=utf-8')
    c.header('Content-Type', 'text/event-stream')

    return stream(c, (stream) =>
      stream.pipe((answer as StreamTextResult<Record<string, CoreTool>>).textStream)
    )
  } catch (e) {
    console.error(e)
  }
}
