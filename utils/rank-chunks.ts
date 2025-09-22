import dedent from 'dedent'
import _ from 'lodash'
import * as prettier from 'prettier'
import { z } from 'zod'
import type { AIContext } from './_schema'
import { today_is } from './generate-answer'
import { generate_text } from './generate-output'
import type { SResults } from './search-by-vectors'

/**
 * Ranks and filters chunks based on their relevance scores.
 *
 * @param vect_data - Array of vector search results.
 * @param bm25_data - Array of BM25 search results.
 * @param context - AI context used for scoring chunks.
 * @returns A promise that resolves to the most relevant chunks.
 *
 * The function performs the following steps:
 * 1. Flattens and combines vector and BM25 search results.
 * 2. Scores each chunk using the provided context.
 * 3. Orders the chunks by their scores in descending order.
 * 4. Filters and returns the most relevant chunks.
 *
 * If the `DEBUG` environment variable is set, the function will also write
 * intermediate data to JSON files for debugging purposes.
 */
export const rank_chunks = async (
  vect_data: SResults[],
  bm25_data: SResults[],
  context: AIContext
) => {
  // Flatten chunks and combine them
  const v_chunks = flatten_searches(vect_data)
  const t_chunks = _.differenceBy(flatten_searches(bm25_data), v_chunks, 'chunk_hash')
  const chunks = [...v_chunks, ...t_chunks]

  // Score chunks...
  const chunk_scores = await Promise.all(chunks.map((chunk) => score_chunk(context, chunk)))

  // Retrive chunk content and its source (community, proprietary)...
  const scored_chunks = _.orderBy(
    chunks.map((chunk, index) => ({
      score: chunk_scores[index].score,
      reasoning: chunk_scores[index].reasoning,
      chunk_text: chunk.chunk_text,
      source: chunk.source
    })),
    ['score'],
    ['desc']
  )

  // Finally keep only the most relevant ones...
  const relevant_chunks = pick_relevant_chunks(scored_chunks)

  // For debugging purpose only
  if (Bun.env.DEBUG) {
    const print = async (
      data:
        | {
            chunk_hash: string
            chunk_text: string
            distance: number
            source: string
          }[]
        | {
            score: number
            reasoning: string | null
            chunk_text: string
            source: string
          }[]
        | { community: string[]; proprietary: string[] }
    ) => await prettier.format(JSON.stringify(data), { parser: 'json' })

    Bun.write('temp/1. search-v.json', await print(v_chunks))
    Bun.write('temp/2. search-t.json', await print(t_chunks))
    Bun.write('temp/3. chunks-c.json', await print(chunks))
    Bun.write('temp/4. chunks-s.json', await print(scored_chunks))
    Bun.write('temp/5. chunks-r.json', await print(relevant_chunks))
  }

  return Relevant_Chunks.parse(relevant_chunks)
}

//
//
//
//
// Typescrit Types
//
//
//
//

const Flatten_Chunk = z.object({
  chunk_hash: z.string(),
  distance: z.number(),
  chunk_text: z.string(),
  source: z.string()
})

const Relevant_Chunks = z.object({
  community: z.array(z.string()).default([]),
  proprietary: z.array(z.string()).default([])
})

export type Flatten_Chunk = z.infer<typeof Flatten_Chunk>
export type Relevant_Chunks = z.infer<typeof Relevant_Chunks>

//
//
//
//
//
// Helpers
//
//
//
//
//

/**
 * Flattens and ranks vector search results.
 *
 * This function takes an array of search results, flattens the nested
 * structure, groups the results by their source, and then ranks the chunks
 * within each group by their distance. It returns the top 50 closest chunks for
 * each source.
 *
 * @param {SResults[]} data - The array of search results to be processed.
 * @returns {Flatten_Chunk[]} - The flattened and ranked array of chunks.
 */
export const flatten_searches = (data: SResults[]): Flatten_Chunk[] =>
  _.chain(data)
    .flatMap((o) =>
      Object.entries(o).flatMap(([source, items]) => {
        if (Array.isArray(items)) {
          return items.map((item) => ({
            ...item,
            source
          }))
        }
        return []
      })
    )
    .groupBy('source')
    .mapValues((entries) =>
      _(entries)
        .groupBy('chunk_hash')
        .map((group) => _.minBy(group, 'distance'))
        .compact()
        .orderBy('distance')
        .take(15)
        .value()
    )
    .values()
    .flatMap()
    .value()

/**
 * Picks the most relevant chunks from the provided scores.
 *
 * @param scores - An array of objects containing score, chunk_text, and source.
 * @returns An object with keys as sources and values as arrays of the top 5 chunk_texts
 *          with scores greater than or equal to 500, ordered by score in descending order.
 *          Defaults to empty arrays for sources 'proprietary' and 'community'.
 */
export const pick_relevant_chunks = (
  scores: {
    score: number
    chunk_text: string
    source: string
  }[]
): Relevant_Chunks =>
  _.chain(scores)
    .groupBy('source')
    .mapValues((array) =>
      _.chain(array)
        .orderBy('score', 'desc')
        .filter((o) => o.score >= 500)
        .take(5)
        .map('chunk_text')
        .value()
    )
    .defaults({ proprietary: [], community: [] })
    .value()

/**
 * Scores a given chunk of text based on its relevance and clarity in answering the user's final intent.
 *
 * @note This function is manually tested using `bun eva:reranker` command.
 * @param context - The AI context containing the conversation history and configuration.
 * @param chunk - The chunk of text to be evaluated.
 * @returns A promise that resolves to the score of the chunk.
 *
 * The function uses an LLM to generate a score based on multiple following criteria.
 * The score is enclosed within <score> tags in the response for an easy retrieval.
 * CAUTION: if prompt ask only for a score, reasoning quality will be low!
 */
export const score_chunk = async (context: AIContext, chunk: Flatten_Chunk) => {
  const score = await generate_text({
    model: context.config.models.augment_with,
    messages: [
      ...context.conversation,
      {
        role: 'system',
        content: dedent`
        
        You are an expert in semantic relevance evaluation and contextual understanding. Your task is to analyze the entire conversation between the user and the agent to determine whether the provided chunk effectively answers the user’s final intent or standalone question.

        Today is ${today_is()}.
        
        You are evaluating the following chunk:

        <chunk>
        ${chunk.chunk_text}
        </chunk>
        
        **Evaluation Criteria**
        
        1. Answer Presence – Does the chunk contain the answer to the user’s final intent?
        2. Relevance – Is the answer directly related to the user’s question, including implicit meaning?
        
        **Validation Check**
        
        - Correct Reference – If the user refers to a specific building but the chunk discusses a different one, score 0, unless the response is still broadly relevant.
        - Hidden Answer – If only a small part of the chunk answers the question, score based on that portion.
        
        **Scoring Scale**

        - 1000 (Perfect Match) – Accurately answers the final user intent.
        - 1-999 (Partial Match) – The response is relevant but lacks precision, completeness, or clarity.
        - 0 (No Match) – No meaningful connection to the user’s intent.
        
        **Think carefully but quickly and output ONLY the score within <score> tags.**`
      }
    ],
    max_tokens: 500
  })

  return extract_score_and_reasoning(score)
}

/**
 * Extracts a numerical score from a given text string.
 *
 * @note This function is tested in tests/unit/utils/extract-score.test.ts
 * @param text - The text string from which to extract the score. It can be a string, null, or undefined.
 * @returns The extracted score as a number. If the text is not a string or if no score is found, returns 0.
 */
export const extract_score_and_reasoning = (text: string | null | undefined) => {
  if (typeof text !== 'string' || text === '') {
    return { score: 0, reasoning: null }
  }

  const score_match = text.match(/<score>\s*(\d+)\s*<\/score>/)
  const score = score_match ? Number.parseFloat(score_match[1]) : 0

  const think_match = text.match(/<think>\s*(.*?)\s*<\/think>/)
  const think = think_match ? think_match[1].trim() : null

  return { score: score, reasoning: think }
}
