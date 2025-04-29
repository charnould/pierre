import type { StreamTextResult, Tool } from 'ai'
import type { Context } from 'hono'
import { stream } from 'hono/streaming'
import { AIContext, type Config, type SMS } from '../utils/_schema'
import { augment_query } from '../utils/augment-query'
import { stream_answer } from '../utils/deliver-answer'
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

/**
 * Controller function to handle server-sent events streaming.
 *
 * This function sets the necessary headers for enabling server-sent events streaming.
 * It runs the request logic with a 50-second timeout constraint. If the execution exceeds
 * the limit, it throws a timeout error. Otherwise, it returns the successful result.
 */
export const controller = async (c: Context) => {
  try {
    // Set the necessary headers for enabling server-sent events streaming
    c.header('X-Vercel-AI-Data-Stream', 'v1')
    c.header('Content-Type', 'text/event-stream; charset=utf-8')

    // Run the request logic with a 50-second timeout constraint (Cloudflare has
    // a 60-second timeout). If execution exceeds the limit, it throws a timeout
    // error. Otherwise, return the successful result.
    const answer = await Promise.race([
      search_and_answer(c),
      new Promise((_, reject) => setTimeout(reject, 50000, new Error('Timeout')))
    ])

    return answer
  } catch (e) {
    // Log the error and send the error message through
    // the stream to display a user-friendly errors
    console.error(e)
    return stream(c, async (stream) => {
      stream.writeln('pierre_error')
    })
  }
}

/**
 * Handles AI logic for incoming requests, either from SMS or web.
 *
 * The function performs the following steps:
 * 1. Initializes performance measurement variables.
 * 2. Sets variables and types.
 * 3. Checks if the incoming request is a valid SMS.
 * 4. Parses the context based on the request type (SMS or web).
 * 5. Applies AI logic to generate an appropriate response.
 * 6. Sends the response back to the user.
 *
 * The AI logic includes:
 * - Saving the user's reply.
 * - Augmenting the query.
 * - Performing vector and BM25 searches.
 * - Reranking the search results.
 * - Handling different knowledge access levels.
 * - Generating responses based on the context and knowledge access.
 *
 * Performance measurements are logged for various stages of the AI logic.
 *
 * If the request is an SMS, a full-text answer is sent back via SMS.
 * If the request comes from the web, a stream response is returned.
 *
 * In case of errors, an error message is logged and an error response is streamed back.
 */
const search_and_answer = async (c: Context) => {
  try {
    // Set performance measurement variables
    let t0 = 0
    let t1 = 0
    let t2 = 0
    let t3 = 0
    let t4 = 0
    let t5 = 0
    let t6 = 0

    // Set variables and types
    let is_sms = false
    let context: AIContext
    let parsed_sms: SMS = null
    let answer: string | StreamTextResult<Record<string, Tool>, unknown>

    //
    // Check if incoming request is a valid SMS
    // TODO: handle wrong `/sms` request
    //

    if (c.req.path === '/sms') {
      parsed_sms = await parse_incoming_sms(await c.req.json())
      if (parsed_sms !== null) is_sms = true
    }

    if (is_sms) {
      context = await AIContext.parseAsync(parsed_sms)
    } else {
      context = await AIContext.parseAsync({
        role: 'user',
        metadata: { user: c.get('user')?.email ?? null },
        conv_id: c.req.query('conv_id'),
        config: c.req.query('config'),
        content: c.req.query('message'),
        custom_data: { raw: c.req.query('data')?.split('|') }
      })
    }

    //
    // The Main Part: "Apply AI Logic"
    //

    // Save reply (= what the user just said)
    save_reply(context)

    context = await AIContext.parseAsync({
      ...context,
      conversation: get_conversation(context.conv_id)
    })

    // Get knowledge access for user query considering current context
    let knowledge_access = {
      community: true,
      proprietary: { public: false, private: false }
    }

    if (typeof context.config !== 'string') {
      knowledge_access = context.config.knowledge
    }

    if (
      knowledge_access.proprietary.private === false &&
      knowledge_access.proprietary.public === false &&
      knowledge_access.community === false
    ) {
      answer = await stream_answer(context)
    } else {
      t0 = performance.now()

      //
      //
      //
      // QUERY AUGMENTATION
      //

      context.query = await augment_query(context)

      // end: QUERY AUGMENTATION
      t1 = performance.now()

      // If query is relevant and does not contain profanity, answer with intelligence
      // This is here that "intelligence" must occur: if `context.chunks` contains bullshit,
      // PIERRE answer will probably be bullshit!
      if (context.query && !context.query.contains_profanity) {
        t2 = performance.now()

        //
        //
        //
        // EMBEDDINGS GENERATION
        const embeddings = await generate_embeddings(
          [
            ...[context.content], // IMPORTANT: keep `context.content` in an array
            ...context.query.standalone_questions,
            ...context.query.search_queries
          ],
          { provider: 'ollama', batch: true }
        )

        t3 = performance.now()
        // end: EMBEDDINGS GENERATION

        //
        //
        //
        // VECTOR SEARCH
        const v_results = await Promise.all(embeddings.map((e) => vector_search(e, context)))

        t4 = performance.now()
        // end: VECTOR SERCH

        //
        //
        //
        // BM25 SEARCH
        const k_results = await Promise.all(
          context.query.bm25_keywords.map((k) => bm25_search(k, context))
        )

        t5 = performance.now()
        // end: BM25 SEARCH

        //
        //
        //
        // RERANKER
        context.chunks = await rank_chunks(
          v_results.filter((chunk) => chunk !== undefined), // TODO: vector_search must not return undefined
          k_results.filter((chunk) => chunk !== undefined), // TODO: vector_search must not return undefined
          context
        )

        t6 = performance.now()
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

      // Mark the end of the request for performance measurement
      // and log a performance measurement table
      console.table([
        ['augment   ', `${t1 - t0}ms`],
        ['embed     ', `${t3 - t2}ms`],
        ['v_search  ', `${t4 - t3}ms`],
        ['b_search  ', `${t5 - t4}ms`],
        ['rerank    ', `${t6 - t5}ms`],
        ['----------', '------------'],
        ['TOTAL     ', `${t6 - t0}ms`]
      ])
    }
    //
    // Step 5.
    // Send answer to the user
    //

    // If incoming request is a SMS:
    // return a full-text answer
    if (is_sms && parsed_sms !== null) {
      await send_sms({
        from: (context.config as Config).phone,
        to: parsed_sms.to,
        message: answer
      })

      return c.body('ok', 200)
    }

    // If incoming request comes from www:
    // return a stream
    return stream(
      c,
      async (stream) => {
        stream.onAbort(() => {
          stream.writeln('pierre_error')
        })

        await stream.pipe((answer as StreamTextResult<Record<string, Tool>, unknown>).textStream)
      },
      (e, stream) => {
        stream.writeln('pierre_error')
        throw new Error('pierre_error', e)
      }
    )
  } catch (e) {
    console.error(e)
    return stream(c, async (stream) => {
      stream.writeln('pierre_error')
      stream.onAbort(() => {
        stream.writeln('pierre_error')
      })
    })
  }
}
