import { createAnthropic } from '@ai-sdk/anthropic'
import { createCohere } from '@ai-sdk/cohere'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import _ from 'lodash'
import * as prettier from 'prettier'
import { z } from 'zod'
import type { AIContext } from './_schema'
import { today_is } from './generate-answer'
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
  // Flatten chunks and combine them
  // TODO: Think again if it's clever to do this way (adding chunks)
  const vect_chunks = flatten_vector_searches(vect_data)
  const bm25_chunks = _.differenceBy(flatten_vector_searches(bm25_data), vect_chunks, 'chunk_hash')
  const chunks = [...vect_chunks, ...bm25_chunks]

  // Score chunks...
  const chunk_scores = await Promise.all(chunks.map((chunk) => score_chunk(context, chunk)))

  // Retrive chunk content and its source (community, private, public)...
  const scored_chunks = _.orderBy(
    chunks.map((chunk, index) => ({
      score: chunk_scores[index],
      global_score:
        chunk_scores[index].building_score +
        chunk_scores[index].process_score +
        chunk_scores[index].relevancy_score,
      chunk_text: chunk.chunk_text,
      source: chunk.source
    })),
    ['global_score'],
    ['desc']
  )

  // Finally keep only the most relevant ones...
  // TODO: when possible, upgrade model (gpt4-o-mini has flaws)
  const relevant_chunks = pick_relevant_chunks(scored_chunks)

  //
  //
  // For debugging purpose only
  if (Bun.env.DEBUG) {
    const print = async (
      data:
        | {
            chunk_hash: string
            chunk_text: string
            entity_hash: string
            distance: number
            source: string
          }[]
        | {
            score: { building_score: number; process_score: number; relevancy_score: number }
            global_score: number
            chunk_text: string
            source: string
          }[]
        | { community: string[]; private: string[]; public: string[] }
    ) => await prettier.format(JSON.stringify(data), { parser: 'json' })
    Bun.write('__temp__/1.chunks_from_vect_search.json', await print(vect_chunks))
    Bun.write('__temp__/2.chunks_from_bm25_search.json', await print(bm25_chunks))
    Bun.write('__temp__/3.chunks_combined.json', await print(chunks))
    Bun.write('__temp__/4.chunks_scores.json', await print(scored_chunks))
    Bun.write('__temp__/5.relevant_chunks.json', await print(relevant_chunks))
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
  chunk_hash  : z.string(),
  entity_hash : z.string(),
  distance    : z.number(),
  chunk_text  : z.string(),
  source      : z.string()
})

// prettier-ignore
// biome-ignore format: readability
const Score = z.object({ building_score : z.number(),
  process_score : z.number(),
  relevancy_score : z.number()
 })

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
        .groupBy('chunk_hash')
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
// Build final chunks object keeping only relevant ones.
// This function returns the final result of the reranking process
export const pick_relevant_chunks = (
  scores: {
    score: { building_score: number; process_score: number; relevancy_score: number }
    global_score: number
    chunk_text: string
    source: string
  }[]
): Relevant_Chunks =>
  _.chain(scores)
    .groupBy('source')
    .mapValues((array) =>
      _.chain(array)
        .orderBy('global_score', 'desc')
        .filter((o) => o.global_score >= 500)
        .take(5)
        .map('chunk_text')
        .value()
    )
    .defaults({ public: [], private: [], community: [] })
    .value()

//
//
//
// Evaluate if a chunk from the vector search is relevant
// to the user query, with a focus on standalone questions.
export const score_chunk = async (context: AIContext, chunk: Flatten_Chunk): Promise<Score> => {
  const openai = createOpenAI({ compatibility: 'strict' })
  const google = createGoogleGenerativeAI()
  const anthropic = createAnthropic()
  const mistral = createMistral()
  const cohere = createCohere()

  const { object } = await generateObject({
    schema: z.object({
      reasoning: z.string().describe('Justification for the scores'),
      building_score: z.number().describe('Building score'),
      process_score: z.number().describe('Process score'),
      relevancy_score: z.number().describe('Global relevancy score')
    }),
    // biome-ignore lint: server-side eval to keep `config.ts` simple
    model: eval(context.config.context[context.current_context].models.rerank_with),
    temperature: 0,
    maxTokens: 125,
    prompt: `

You are an advanced semantic relevance evaluator with expertise in nuanced text analysis and contextual comprehension. Your task is to evaluate how effectively a given text answers a user query, assigning relevance scores based on a deep understanding of semantic alignment, precision, and context.

# Inputs

## Chunk

<chunk>
${chunk.chunk_text}
</chunk>

## User Query

<user_query>
${context.query?.standalone_questions.length !== 0 ? context.query?.standalone_questions.map((q: string) => `- ${q}\n`) : context.content}
</user_query>

# Evaluation Steps

Think step by step and describe in 10-20 words your reasoning for choosing these scores.
Tasks are totally independant. Today is ${today_is()}.

## Task: Identify the Building of the Chunk
${
  context.query?.named_entities.building !== null
    ? `
  
  Assess whether the chunk explicitly or implicitly refers to a building (e.g., building, house, residence, housing program, etc.) with a name resembling “${context.query?.named_entities.building}”. Be cautious of cases where the name might also belong to a person, such as distinguishing between a person named “Jean Racine” and a house called “Racine”:

  - Score 0: The chunk mention another building.
	- Score 1000: The chunk explicitly and unambiguously discusses the building in question.
	- Score 1-999: The reference to a building is unclear, ambiguous, or only loosely connected, requiring further clarification.
`
    : 'Assign a building score of 0.'
}

## Task: Determine if the Chunk Discusses a Specific Company Process or Guideline

${
  context.query?.named_entities.process !== null
    ? `

Evaluate whether the chunk pertains to the process “${context.query?.named_entities.process}”, specifically focusing on the company’s procedures, workflows, or standard ways of working. This includes assessing if the chunk describes, references, or aligns with the operational or organizational methods associated with the specified process:

- Score 0: The chunk mention another process or no process is evocated
- Score 1000: The chunk explicitly addresses the process with high accuracy.
- Score 1-999: Partial or nuanced relevance (e.g., related processes but not an exact match). Example: “Une panne d’ascenseur” is distinct from “Un locataire bloqué dans l’ascenseur”.
`
    : 'Assign a process/guideline score of 0.'
}

## Task: Evaluate Overall Relevance

Assess the chunk’s alignment with the user query, considering that relevant answers might be explicit, implicit, or require interpretation from the context. Keep in mind partial relevance is still highly valuable. Use the following criteria:
1. Answer Precision
  - Determines if the chunk addresses the query intent, even partially.
	- Evaluates how clear, comprehensive, and unambiguous the response is.
2. Semantic Matching
  - Examines the degree of alignment between the query’s intent and the chunk’s content.
  - Accounts for both explicit information and implicit clues that may require deeper understanding to uncover relevance.
3. Information Quality
  - Evaluates the specificity and richness of the details provided in the chunk.
	- Assesses how actionable, precise, and unambiguous the information is, even if the answer is partially hidden within broader context.

Scoring Scale:
- **1000 (Perfect Match)**: The chunk fully addresses the query, offers clear and comprehensive information, provides multiple confirmatory points, and includes actionable insights.
- **500-999 (Partial Match)**: The chunk contains at least part of the answer to the query. The score should reflect the degree of alignment, detail, and clarity. **If the chunk contains any relevant part of the answer, it must score at least 500**.
- **0-499 (Low or No Match)**: The chunk shows limited or no connection to the query. Scores in this range should be reserved for cases where relevance is unclear or missing entirely. Before assigning a score below 500, carefully re-check the chunk for overlooked relevance or implicit connections.

Please proceed with your analysis and evaluation of the given query and chunk

`.trim()
  })

  return object
}
