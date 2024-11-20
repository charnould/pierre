import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import _ from 'lodash'
import { z } from 'zod'
import type { AIContext } from './_schema'
import type { Vector_Search_Result } from './search-by-vectors'

//
//
//
//
// (Re-)Ranker
//
//
//
//
export const rank_chunks = async (data: Vector_Search_Result[], context: AIContext) => {
  const chunks = flatten_vector_searches(data)
  const chunk_scores = await Promise.all(chunks.map((chunk) => score_chunk(context, chunk)))
  const relevant_chunks = pick_relevant_chunks(chunks, chunk_scores)

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

// prettier-ignore
// biome-ignore format: readability
const Flatten_Chunk = z.object({
  rowid     : z.number(),
  distance  : z.number(),
  chunk     : z.string(),
  source    : z.string()
})

// prettier-ignore
// biome-ignore format: readability
const Score = z.object({
  rowid   : z.number(),
  source  : z.string(),
  score   : z.number() })

// prettier-ignore
// biome-ignore format: readability
const Relevant_Chunks = z.object({
  community     : z.array(z.string()).default([]),
  private       : z.array(z.string()).default([]),
  public        : z.array(z.string()).default([])
})

export type Score = z.infer<typeof Score>
export type Flatten_Chunk = z.infer<typeof Flatten_Chunk>
export type Relevant_Chunks = z.infer<typeof Relevant_Chunks>

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
//
//
// Simplify vector search results into a flat array,
// retaining only the most relevant entries
export const flatten_vector_searches = (data: Vector_Search_Result[]): Flatten_Chunk[] =>
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
        .groupBy('rowid')
        .map((group) => _.minBy(group, 'distance'))
        .compact()
        .orderBy('distance')
        .take(6)
        .value()
    )
    .values()
    .flatMap()
    .value()

//
//
//
// Reconcile chunk rankings/scores with their content
// This function returns the result of the reranking process
export const pick_relevant_chunks = (chunks: Flatten_Chunk[], scores: Score[]): Relevant_Chunks =>
  _(scores)
    .filter((o) => o.score > 70)
    .orderBy(['score'], ['desc'])
    .groupBy('source')
    .mapValues((g) =>
      g
        .map(({ rowid, source }) => _.get(_.find(chunks, { rowid, source }), 'chunk'))
        .filter(Boolean)
    )
    .defaults({ public: [], private: [], community: [] })
    .value()

//
//
//
// Evaluate if a chunk from the vector search is relevant to the user query,
// with a focus on standalone questions.
export const score_chunk = async (context: AIContext, chunk: Flatten_Chunk): Promise<Score> => {
  const openai = createOpenAI({ compatibility: 'strict' })
  const { object } = await generateObject({
    schema: z.object({ rowid: z.number(), source: z.string(), score: z.number() }),
    model: openai('gpt-4o-mini-2024-07-18', { structuredOutputs: true }),
    temperature: 0.5,
    prompt: `

You are an expert evaluator designed to assess how effectively a text chunk aligns with a user’s query. Analyze the provided information and assign a relevance score between 1 (least relevant) and 100 (most relevant). Your evaluation should focus on the chunk’s ability to address the user’s query effectively and provide meaningful information.

Instructions:

1. Carefully analyze the provided input below.
2. Assign a relevance score (1-100) based on how effectively the chunk addresses the query.
3. Provide a structured JSON output with the score.

Input:

<row_id>${chunk.rowid}</row_id>
<source>${chunk.source}</source>
<user_query>
${context.query?.standalone_questions.map((q: string) => `- ${q}\n`)}
</user_query>

<chunks>${chunk.chunk}</chunks>`.trim()
  })

  return object
}
