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
import { generate_embeddings, vector_search } from '../utils/search-by-vectors'
import { send_sms } from '../utils/send-sms'
import { view } from '../views/llm-error'

export const controller = async (c: Context) => {
  try {
    // Mark the start of the request for performance measurement
    performance.mark('s_rq')

    //
    // Step 1.
    // Set variables and types
    //

    let is_sms = false
    let parsed_sms: SMS = null
    let context: AIContext
    let answer: string | StreamTextResult<Record<string, CoreTool>, unknown>

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

    // Save reply (= what the user just said) and because of `true` save also this
    // reply to PIERRE (= telemetry) if `telemetry` env. variable is also `true`
    save_reply(context, true)

    //
    //
    // QUERY AUGMENTATION
    //
    //

    performance.mark('s_aq')
    context = await AIContext.parseAsync({
      ...context,
      conversation: get_conversation(context.conv_id)
    })
    context.query = await augment_query(context)
    performance.mark('e_aq')
    // end: QUERY AUGMENTATION

    // If query is relevant and does not contain profanity, answer with intelligence
    // This is here that "intelligence" must occur: if `context.chunks` contains bullshit,
    // PIERRE answer will probably be bullshit!
    if (context.query && !context.query.contains_profanity) {
      // Get knowledge access for user query considering current context
      let knowledge_access = {
        community: true,
        proprietary: { public: false, private: false }
      }

      if (typeof context.config !== 'string') {
        knowledge_access = context.config.context[context.current_context].knowledge
      }

      //
      //
      // VECTOR SEARCH
      //
      //

      performance.mark('s_vs')
      const embeddings = await generate_embeddings([
        ...context.content,
        ...context.query.standalone_questions,
        ...context.query.stepback_questions,
        ...context.query.search_queries,
        ...context.query.hyde_answers
      ])
      const v_results = await Promise.all(embeddings.map((e) => vector_search(e, context)))
      performance.mark('e_vs')
      // end: VECTOR SERCH

      //
      //
      // BM25 SEARCH
      //
      //

      performance.mark('s_bs')
      const k_results = await Promise.all(
        context.query.bm25_keywords.map((k) => bm25_search(k, context))
      )
      performance.mark('e_bs')
      // end: BM25 SEARCH

      //
      //
      // RERANKER
      //
      //

      performance.mark('s_rr')
      context.chunks = await rank_chunks(
        v_results.filter((chunk) => chunk !== undefined), // TODO: vector_search must not return undefined
        k_results.filter((chunk) => chunk !== undefined), // TODO: vector_search must not return undefined
        context
      )
      performance.mark('e_rr')
      // end:RERANKER

      // If the reranker returns no relevant results, it indicates that
      // either the question is unrelated to housing  or PIERRE lacks
      // the necessary knowledge to address it. In both cases, respond
      // with a deadlock.
      if (
        (context.chunks.community?.length ?? 0) === 0 &&
        (context.chunks.private?.length ?? 0) === 0 &&
        (context.chunks.public?.length ?? 0) === 0
      ) {
        console.debug('No knowledge chunk: respond with a no-knowledge deadlock.')
        answer = await reach_relevancy_deadlock(context, { is_sms: is_sms })
      }
      // If private knowledge access is `true` (e.g. internal process),
      // it means that user MUST be a collaborator. Hence, answer must
      // be specific to this use case.
      else if (knowledge_access.proprietary.private === true) {
        answer = await answer_collaborator(context, { is_sms: is_sms })
      } else {
        // If private knowledge access is `false`,
        // answer user like a normal user
        answer = await answer_user(context, { is_sms: is_sms })
      }
    } else {
      // If query is irrelevant and/or contains profanity,
      // make a deadlock answer
      answer = await reach_profanity_deadlock(context, { is_sms: is_sms })
    }

    //
    // Step 5.
    // Send answer to the user
    //

    // If incoming request is a SMS: return a full-text answer
    if (is_sms && parsed_sms !== null) {
      await send_sms({
        from: (context.config as Config).phone,
        to: parsed_sms.to,
        message: answer
      })

      return c.body('ok', 200)
    }

    // Mark the end of the request for performance measurement
    // and log a performance measurement table
    performance.mark('e_rq')
    console.table([
      ['augment  ', `${performance.measure('r', 's_aq', 'e_aq').duration}ms`],
      ['v_search ', `${performance.measure('r', 's_vs', 'e_vs').duration}ms`],
      ['b_search ', `${performance.measure('r', 's_bs', 'e_bs').duration}ms`],
      ['rerank   ', `${performance.measure('r', 's_rr', 'e_rr').duration}ms`],
      ['TOTAL    ', `${performance.measure('r', 's_rq', 'e_rq').duration}ms`]
    ])

    // If incoming request comes from www: return a stream

    c.header('X-Vercel-AI-Data-Stream', 'v1')
    c.header('Content-Type', 'text/event-stream; charset=utf-8')

    return stream(c, (stream) =>
      stream
        .pipe((answer as StreamTextResult<Record<string, CoreTool>, unknown>).textStream)
        .catch(() => {
          throw new Error('Streaming or Cloudflare error')
        })
    )
  } catch (e) {
    console.error(e)
    return c.html(view())
  }
}
