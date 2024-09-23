import type { CoreTool, StreamTextResult } from 'ai'
import type { Context } from 'hono'
import { streamText } from 'hono/streaming'
import { AIContext } from '../utils/_schema'
import { answer_user, enhance_query, reach_deadlock } from '../utils/generate-ai-content'
import { get_conversation, save_reply } from '../utils/handle-conversation'
import { rank_chunks } from '../utils/rank-chunks'
import { vector_search } from '../utils/search-by-vectors'

export const controller = async (c: Context) => {
  try {
    //
    // Build AI context
    let ai_context = await AIContext.parseAsync({
      role: 'user',
      id: c.req.param('id') as string,
      config: c.req.query('config'),
      content: c.req.query('message')
    })

    // Save user query in DB
    save_reply(ai_context, true)

    // Step 1. Rewrite, stepback, Hyde...
    // Transformer la question de l'utilisateur en une meilleure question
    // pour optimiser la recherche vectorielle et sémantique
    // Get back all conversation from memory
    ai_context.conversation = get_conversation(ai_context.id)

    ai_context = await AIContext.parseAsync({
      ...ai_context,
      ...(await enhance_query(ai_context))
    })

    let answer: StreamTextResult<Record<string, CoreTool>>

    // If....
    //
    //
    if (
      ai_context.is_greeting === true ||
      ai_context.is_about_housing === false ||
      ai_context.is_about_yourself === true ||
      ai_context.contains_profanity === true
    ) {
      answer = await reach_deadlock(ai_context)
    } else {
      // Step 2. Retrieval
      // Rechercher les chunks (= parties de documents) les plus pertinents

      const chunks = await Promise.all([
        vector_search(ai_context.content),
        vector_search(ai_context.queries[0]),
        vector_search(ai_context.queries[1]),
        vector_search(ai_context.queries[2]),
        vector_search(ai_context.stepback),
        vector_search(ai_context.hyde[0]),
        vector_search(ai_context.hyde[1]),
        vector_search(ai_context.hyde[2])
      ])

      ai_context.chunks = rank_chunks(chunks)

      // Step 3. Generate answer and return a stream
      // Generate AI answer using Retrieval Augmented Generation (RAG)

      answer = await answer_user(ai_context)
    }

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
