import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import _ from 'lodash'
import * as prettier from 'prettier'
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
export const rank_chunks = async (
  vect_data: Vector_Search_Result[],
  bm25_data: Vector_Search_Result[],
  context: AIContext
) => {
  const vect_chunks = flatten_vector_searches(vect_data)
  const bm25_chunks = _.differenceBy(flatten_vector_searches(bm25_data), vect_chunks, 'rowid')
  const chunks = [...vect_chunks, ...bm25_chunks]

  const chunk_scores = await Promise.all(chunks.map((chunk) => score_chunk(context, chunk)))
  const relevant_chunks = pick_relevant_chunks(chunks, chunk_scores)

  // For debugging purpose only
  if (Bun.env.DEBUG) {
    Bun.write(
      '__temp__/all_chunks.json',
      await prettier.format(JSON.stringify(chunks), { parser: 'json' })
    )
    Bun.write(
      '__temp__/chunks_scores.json',
      await prettier.format(JSON.stringify(_.orderBy(chunk_scores, ['score'], ['desc'])), {
        parser: 'json'
      })
    )
    Bun.write(
      '__temp__/relevant_chunks.json',
      await prettier.format(JSON.stringify(relevant_chunks), { parser: 'json' })
    )
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
        .take(50)
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
    .filter((o) => o.score > 69)
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
    model: openai('gpt-4o-2024-11-20', { structuredOutputs: true }),
    // model: openai('gpt-4o-mini-2024-07-18', { structuredOutputs: true }),
    temperature: 1,
    prompt: `

You are an advanced semantic relevance evaluator with expertise in precise text analysis. Your task is to evaluate how well a given chunk of text answers a user's query, assigning a relevance score that reflects a nuanced understanding beyond simple keyword matching.

Here are the inputs you'll be working with:

<row_id>${chunk.rowid}</row_id>
<source>${chunk.source}</source>

<user_query>
${context.query?.standalone_questions.length !== 0 ? context.query?.standalone_questions.map((q: string) => `- ${q}\n`) : context.content}
</user_query>

<chunk>
${chunk.chunk}
</chunk>

Evaluation Criteria:
1. Direct Answer Precision
   - Exact match of query intent
   - Completeness of answer
   - Contextual comprehensiveness
   - Clarity of information provided

2. Semantic Matching
   - Depth of semantic alignment
   - Relevance of implicit and explicit information
   - Contextual richness surrounding the answer

3. Information Quality
   - Specificity of details
   - Unambiguity of response
   - Immediate actionability of information

Scoring Guidelines:
- 100: PERFECT MATCH
  - Query answered with absolute precision
  - Multiple confirmatory passages
  - Comprehensive contextual explanation
  - No ambiguity whatsoever
  - Immediate, actionable information

- Lower scores should be assigned based on how well the chunk meets the above criteria, with scores decreasing as fewer criteria are met or met less fully.

Evaluation Process:
1. Identify exact query matches in the chunk.
2. Assess the comprehensiveness of the context provided.
3. Verify the actionability of the answer.
4. Apply the nuanced scoring methodology based on the criteria and guidelines above.

Before providing your final score and explanation, break down your evaluation process in <evaluation_breakdown> tags. In your evaluation breakdown:
- Explicitly quote relevant parts of the chunk that address the query.
- Evaluate each criterion separately, assigning a sub-score out of 33 for each (Direct Answer Precision, Semantic Matching, Information Quality).
- List out how well each evaluation criterion is met, using a numbered list for clarity.
- Combine sub-scores to get an initial overall score.
- If you initially assign a low score (below 50), double-check to ensure you haven't overlooked a clear answer in the chunk.

After your evaluation breakdown, provide your final evaluation in JSON format. Include a 'score' field (integer from 0 to 100) and an 'explanation' field (string explaining the rationale for the score).

Example output structure:

<evaluation_breakdown>
[Your step-by-step evaluation process here]
</evaluation_breakdown>

{
  "rowid": [Rowid],
  "source": [Source], 
  "score": [Your final score]
}

Please proceed with your analysis and evaluation of the given query and chunk

`.trim()
  })

  return object
}
