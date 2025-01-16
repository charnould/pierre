import { openai } from '@ai-sdk/openai'
import type { EmbeddingModelV1Embedding } from '@ai-sdk/provider'
import { embed, embedMany } from 'ai'
import _ from 'lodash'
import { z } from 'zod'
import { db } from '../utils/database'
import type { Db_Name } from '../utils/database'
import type { AIContext } from './_schema'

//
//
//
//
// Vector search
//
//
//
//
export const vector_search = async (embedding: EmbeddingModelV1Embedding, context: AIContext) => {
  try {
    // Retrieve knowledge access permissions for the current context
    // (e.g., default, team, etc.) + Set a default for TS happiness
    let k = { community: true, proprietary: { public: false, private: false } }

    if (typeof context.config !== 'string' && 'context' in context.config) {
      k = context.config.context[context.current_context].knowledge
    }

    // Initialize the vector search results
    const r: Vector_Search_Result = { community: [], private: [], public: [] }

    // Perform searches based on knowledge access
    const entities = context.query?.named_entities
    if (k.community) r.community = await query_db('community', embedding)
    if (k.proprietary.public) r.public = await query_db('proprietary.public', embedding, entities)
    if (k.proprietary.private)
      r.private = await query_db('proprietary.private', embedding, entities)

    // Parse results and return them to ensure
    // TypeScript types align with the schema
    return Vector_Search_Result.parse(r)
  } catch (e) {
    console.error(e)
    return
  }
}

//
//
//
//
// Helpers + Typescrit type
//
//
//
//

//
// Query the database with the embedding to retrieve the matching chunks
export const query_db = async (
  db_name: Db_Name,
  embedding: EmbeddingModelV1Embedding,
  entities?: { building: string | null; process: string | null } | undefined
) => {
  // Initialize variables
  const db_instance = db(db_name)
  const entity_promises: Promise<string[]>[] = []
  let user_query: {
    entity_hash: string
    chunk_hash: string
    chunk_text: string
    distance: number
  }[]

  // No need to apply entity-specific filters to `community` knowledge.
  // Semantic analysis alone is robust and sufficient for handling the content effectively.
  if (db_name !== 'community') {
    if (entities?.building !== null) {
      entity_promises.push(
        get_relevant_entities({
          // Apply stricter validation and rules when processing data related to a building.
          // Ensure higher standards and fewer allowances for inconsistencies.
          threshold: 0.5,
          entity: `Building: ${entities?.building}`,
          db: db_instance
        })
      )
    }

    if (entities?.process !== null) {
      entity_promises.push(
        get_relevant_entities({
          // Allow for flexibility and leniency when processing data related to a process.
          // Prioritize adaptability to accommodate variations and exceptions.
          threshold: 0.8,
          entity: `Process: ${entities?.process}`,
          db: db_instance
        })
      )
    }
  }

  // Get maybe relevant entities
  const results = (await Promise.all(entity_promises)) ?? []

  // If no relevant `entities` are identified, bypass entity-specific prefilters
  // and directly search for relevant chunks to ensure comprehensive results.
  if (results.length === 0) {
    user_query = search_without_prefiltering(embedding, db_instance)
  } else {
    // If relevant `entities` are identified, apply pre-filters during the search
    // to narrow down the results and focus on entity-specific chunks for precision.
    user_query = search_with_prefiltering(embedding, db_instance, results)

    // If no results are found after pre-filtering,
    // perform a full database search.
    if (user_query.length === 0) user_query = search_without_prefiltering(embedding, db_instance)
  }

  return user_query
}

//
// Get relevant entities
export const get_relevant_entities = async ({ threshold, entity, db }) => {
  // Step 1. Generate guessed entity embedding
  const entity_vectors = await generate_embedding(entity)

  // Step 2. Search in DB for near-looking entities
  const entity_query = db
    .prepare(
      `
      SELECT entity_hash, entity_text, distance
      FROM vectors
      WHERE entity_vector MATCH ? 
      AND k = 15
      `
    )
    .all(new Float32Array(entity_vectors)) as unknown as {
    entity_hash: string
    entity_text: string
    distance: number
  }[]

  // Step 3. Keep only entities that are relevant (= below a thresold)
  const relevant_entities = _.chain(entity_query)
    .filter((item) => item.distance < threshold)
    .uniqBy('entity_hash')
    .map('entity_hash')
    .value()

  return relevant_entities
}

//
// prettier-ignore
// biome-ignore format: readability
// Typescript Type via Zod
export const Vector_Search_Result = z.object({
  community : z.array(z.object({
    chunk_hash  : z.string(),
    chunk_text  : z.string(),
    entity_hash : z.string(),
    distance    : z.number()    })).default([]),

  private   : z.array(z.object({
    chunk_hash  : z.string(),
    chunk_text  : z.string(),
    entity_hash : z.string(),
    distance    : z.number()    })).default([]),

  public    : z.array(z.object({
    chunk_hash  : z.string(),
    chunk_text  : z.string(),
    entity_hash : z.string(),
    distance    : z.number()    })).default([]),
})

export type Vector_Search_Result = z.infer<typeof Vector_Search_Result>

/**
 * Generate Embedding
 *
 * This function generates a vector embedding for a given
 * string using OpenAI's `text-embedding-3-large` model.
 *
 * Returns:
 * - `embedding` (Array<number>)
 */
export const generate_embedding = async (string: string) => {
  try {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-large'),
      value: string
    })

    return embedding
  } catch (e) {
    console.error('Failed to generate embedding:', e)
    throw new Error('Embedding generation failed.')
  }
}

/**
 * Generate EmbeddingS
 *
 * This function generates an array of vector embeddings for a given
 * array of strings using OpenAI's `text-embedding-3-large` model.
 *
 * Returns:
 * - `embeddings` (Array<Array<number>>)
 */
export const generate_embeddings = async (queries: string[]) => {
  try {
    const { embeddings } = await embedMany({
      model: openai.embedding('text-embedding-3-large'),
      values: queries
    })

    return embeddings
  } catch (e) {
    console.error('Failed to generate embeddings:', e)
    throw new Error('Embeddings generation failed.')
  }
}

/**
 * Search Without Prefiltering
 *
 * This function executes a vector similarity search on a database of chunked text data
 * without applying any prefiltering, ensuring that all relevant results are considered.
 *
 * Key Features:
 * - Accepts query vectors for semantic search using vector similarity techniques.
 * - Searches across the entire dataset without narrowing results to specific entities.
 * - Queries the database to fetch the top 10 matching chunks based on vector similarity.
 *
 * Returns:
 * - An array of matching chunks, including:
 *   - `chunk_text` (string): The text content of the matching chunk.
 *   - `chunk_hash` (string): The unique hash identifier for the chunk.
 *   - `entity_hash` (string): The entity hash associated with the chunk.
 *   - `distance` (number): The vector similarity distance of the match.
 */
export const search_without_prefiltering = (query_vectors, database) =>
  database
    .prepare(
      `
      SELECT chunk_text, chunk_hash, entity_hash, distance 
      FROM vectors
      WHERE chunk_vector MATCH ?
      AND k = 10
      `
    )
    .all(new Float32Array(query_vectors)) as unknown as {
    entity_hash: string
    chunk_hash: string
    chunk_text: string
    distance: number
  }[]

/**
 * Search with Prefiltering
 *
 * This function performs a prefiltered vector similarity search on a database of chunked text data.
 *
 * Key Features:
 * - Accepts query vectors for semantic search using vector similarity techniques.
 * - Applies prefilters using provided entity-specific hash filters to narrow down the results.
 * - Queries the database to fetch the top 10 matching chunks based on similarity and prefilter conditions.
 *
 * Returns:
 * - An array of matching chunks, including:
 *   - `chunk_text` (string): The text content of the matching chunk.
 *   - `chunk_hash` (string): The unique hash identifier for the chunk.
 *   - `entity_hash` (string): The entity hash associated with the chunk.
 *   - `distance` (number): The vector similarity distance of the match.
 */
export const search_with_prefiltering = (query_vectors, database, filters) =>
  database
    .prepare(
      `
      SELECT chunk_text, chunk_hash, entity_hash, distance
      FROM vectors
      WHERE chunk_vector MATCH ?
      AND k = 10
      AND entity_hash IN (${_.flattenDeep(filters)
        .map(() => '?')
        .join(', ')})
      `
    )
    .all(new Float32Array(query_vectors), ..._.flattenDeep(filters)) as unknown as {
    entity_hash: string
    chunk_hash: string
    chunk_text: string
    distance: number
  }[]

//
// Calculate Cosine Similarity
// biome-ignore lint:
export const cosine_similarity = (vec_1: any[], vec_2: any[]) => {
  const dot_product = vec_1.reduce((sum, val, i) => sum + val * vec_2[i], 0)
  const magnitude_A = Math.sqrt(vec_1.reduce((sum, val) => sum + val * val, 0))
  const magnitude_B = Math.sqrt(vec_2.reduce((sum, val) => sum + val * val, 0))
  return dot_product / (magnitude_A * magnitude_B)
}
