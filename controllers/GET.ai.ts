import type { StreamTextResult, Tool } from 'ai'
import type { Context } from 'hono'
import { stream } from 'hono/streaming'
import { AIContext } from '../utils/_schema'
import { augment_query } from '../utils/augment-query'
import { stream_text } from '../utils/generate-output'
import {
  answer_user,
  reach_profanity_deadlock,
  reach_relevancy_deadlock
} from '../utils/generate-answer'
import { get_conversation, save_reply } from '../utils/handle-conversation'
import { rank_chunks } from '../utils/rank-chunks'
import { bm25_search } from '../utils/search-by-bm25'
import { generate_embeddings, vector_search } from '../utils/search-by-vectors'

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
 * Handles AI logic for incoming requests.
 *
 * The function performs the following steps:
 * 1. Initializes performance measurement variables.
 * 2. Sets variables and types.
 * 3. Parses the context based on the request type.
 * 4. Applies AI logic to generate an appropriate response.
 * 5. Sends the response back to the user.
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
    let answer: string | StreamTextResult<Record<string, Tool>, unknown>

    const context = await AIContext.parseAsync({
      config: (await import(`../assets/${c.req.query('config')}/config`)).default,
      custom_data: { raw: c.req.query('data')?.split('|') },
      metadata: { user: c.get('user')?.email ?? null },
      content: c.req.query('message'),
      conv_id: c.req.query('conv_id'),
      role: 'user'
    })

    //
    // The Main Part: "Apply AI Logic"
    //

    // Save reply (= what the user just said)
    await save_reply(context)

    context.conversation = (await get_conversation(context.conv_id)) as AIContext['conversation']

    // Get knowledge access for user query considering current context
    let knowledge_access = {
      community: true,
      proprietary: false
    }
    knowledge_access = context.config.knowledge

    if (knowledge_access.proprietary === false && knowledge_access.community === false) {
      answer = await stream_text({ context: context, model: context.config.models.answer_with })
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
          [context.content, ...context.query.standalone_questions, ...context.query.search_queries],
          { provider: 'ollama', batch: true }
        )

        t3 = performance.now()
        // end: EMBEDDINGS GENERATION

        //
        //
        // Todo: Regroup in another promise.all ?
        // (to avoid waiting v_results before doing k_results)

        // VECTOR SEARCH
        const v_results = await Promise.all(embeddings.map((v) => vector_search(v, context)))

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
        // end: RERANKER

        // If the reranker returns no relevant results, it indicates that
        // either the question is unrelated to housing  or PIERRE lacks
        // the necessary knowledge to address it. In both cases, respond
        // with a deadlock.
        if (
          (context.chunks.community?.length ?? 0) === 0 &&
          (context.chunks.proprietary?.length ?? 0) === 0
        ) {
          console.debug('No knowledge chunk: respond with a no-knowledge deadlock.')
          answer = await reach_relevancy_deadlock(context)
        } else {
          answer = await answer_user(context)
        }
      } else {
        // If query is irrelevant and/or contains profanity,
        // make a deadlock answer
        answer = await reach_profanity_deadlock(context)
      }

      // Mark the end of the request for performance measurement
      // and log a performance measurement table
      console.table([
        ['augment   ', `${(t1 - t0).toFixed(3)}ms`],
        ['embed     ', `${(t3 - t2).toFixed(3)}ms`],
        ['v_search  ', `${(t4 - t3).toFixed(3)}ms`],
        ['b_search  ', `${(t5 - t4).toFixed(3)}ms`],
        ['rerank    ', `${(t6 - t5).toFixed(3)}ms`],
        ['----------', '------------'],
        ['TOTAL     ', `${(t6 - t0).toFixed(3)}ms`]
      ])
    }
    //
    // Step 5.
    // Send answer to the user
    //

    // If incoming request comes from www:
    // return a stream
    return stream(
      c,
      async (stream) => {
        stream.onAbort(() => {
          stream.writeln('pierre_error')
        })

        await stream.pipe(answer.textStream)
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
