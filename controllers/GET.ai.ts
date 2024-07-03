import type { CoreTool, StreamTextResult } from 'ai'
import type { Context } from 'hono'
import { streamText } from 'hono/streaming'
import { AIContext } from '../utils/_schema'
import { TextDecoderStream } from '../utils/bun-ponyfill'
import { answer_user, enhance_query, reach_deadlock } from '../utils/generate-ai-content'
import { rank_chunks } from '../utils/rank-chunks'
import { get_conversation, save_conversation } from '../utils/run-telemetry'
import { keyword_search } from '../utils/search-by-keywords'
import { vector_search } from '../utils/search-by-vectors'

// TextDecoderStream isn't yet implemented in Bun
Object.assign(globalThis, { TextDecoderStream })

export const controller = async (c: Context) => {
  try {
    //
    // Build AI context
    let ai_context = await AIContext.parseAsync({
      role: 'user',
      id: c.req.param('id') as string,
      config: c.req.query('config'),
      raw: c.req.query('message')
    })

    console.log('ejpofjezopfjezopfj', ai_context)
    // Save user query in DB
    save_conversation(ai_context)

    // Step 1. Rewrite, stepback, Hyde...
    // Transformer la question de l'utilisateur en une meilleure question
    // pour optimiser la recherche vectorielle et sémantique
    // Get back all conversation from memory
    ai_context = await AIContext.parseAsync({
      ...ai_context,
      ...get_conversation(ai_context.id)
    })
    ai_context = await AIContext.parseAsync({
      ...ai_context,
      ...(await enhance_query(ai_context))
    })

    console.log('###### AUGMENTED #####\n', ai_context)

    let answer: StreamTextResult<Record<string, CoreTool>>

    // If....
    //
    //
    if (ai_context.about_housing === false || ai_context.vagueness > 6) {
      answer = await reach_deadlock(ai_context)
    } else {
      // Step 2. Retrieval
      // Rechercher les chunks (= parties de documents)
      // les plus pertinentes avec une double recherche :
      // sémantique et vectorielle

      const chunks = await Promise.all([
        vector_search(ai_context.raw),
        vector_search(ai_context.queries[0]),
        vector_search(ai_context.queries[1]),
        vector_search(ai_context.queries[2]),
        vector_search(ai_context.stepback),
        vector_search(ai_context.hyde[0]),
        vector_search(ai_context.hyde[1]),
        vector_search(ai_context.hyde[2])
        // keyword_search() - Need to be fixed (must return relevant results)
      ])

      ai_context.chunks = rank_chunks(chunks)
      //console.log('############## AI_CONTEXT ##############\n', ai_context)

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
