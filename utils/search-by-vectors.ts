import { openai } from '@ai-sdk/openai'
import type { EmbeddingModelV1Embedding } from '@ai-sdk/provider'
import { embedMany } from 'ai'
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

    if (typeof context.config !== 'string') k = context.config.knowledge

    // Initialize the vector search results
    const r: Vector_Search_Result = { community: [], private: [], public: [] }

    // Perform searches based on knowledge access
    if (k.community) r.community = await query_db('community', embedding)
    if (k.proprietary.public) r.public = await query_db('proprietary.public', embedding)
    if (k.proprietary.private) r.private = await query_db('proprietary.private', embedding)

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
export const query_db = async (db_name: Db_Name, embedding: EmbeddingModelV1Embedding) => {
  const db_instance = db(db_name)
  const user_query = search(embedding, db_instance)
  return user_query
}

// TODO: remove from schema and DB entites hash & cie

//
// prettier-ignore
// biome-ignore format: readability
// Typescript Type via Zod
export const Vector_Search_Result = z.object({
  community : z.array(z.object({
    chunk_hash  : z.string(),
    chunk_text  : z.string(),
    distance    : z.number()    })).default([]),

  private   : z.array(z.object({
    chunk_hash  : z.string(),
    chunk_text  : z.string(),
    distance    : z.number()    })).default([]),

  public    : z.array(z.object({
    chunk_hash  : z.string(),
    chunk_text  : z.string(),
    distance    : z.number()    })).default([]),
})

export type Vector_Search_Result = z.infer<typeof Vector_Search_Result>

/**
 * Generate Embeddings
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
 * Search
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
 *   - `distance` (number): The vector similarity distance of the match.
 */
export const search = (query_vectors, database) =>
  database
    .prepare(
      `
      SELECT chunk_text, chunk_hash, distance 
      FROM vectors
      WHERE chunk_vector MATCH ?
      AND k = 10
      `
    )
    .all(new Float32Array(query_vectors)) as unknown as {
    chunk_hash: string
    chunk_text: string
    distance: number
  }[]
