import { openai } from '@ai-sdk/openai'
import { embed } from 'ai'
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
export const vector_search = async (query: string, context: AIContext) => {
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
    if (k.community) r.community = await query_db('community', query)
    if (k.proprietary.public) r.public = await query_db('proprietary.public', query, entities)
    if (k.proprietary.private) r.private = await query_db('proprietary.private', query, entities)

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
export const query_db = async (db_name: Db_Name, query: string, entities?) => {
  const db_instance = db(db_name)

  // Step 1. Prefilter
  const entity_promises: Promise<string[]>[] = []

  // No need to filter community knowledge on entities
  // Semantic is plennty sufficient.
  if (db_name !== 'community') {
    if (entities.building !== null) {
      entity_promises.push(
        get_relevant_entities({
          threshold: 0.5, // Be less forgiven for a building
          entity: `Building: ${entities.building}`,
          db: db_instance
        })
      )
    }

    if (entities.process !== null) {
      entity_promises.push(
        get_relevant_entities({
          threshold: 0.8, // Be forgiven for a process
          entity: `Process: ${entities.process}`,
          db: db_instance
        })
      )
    }
  }

  const results = (await Promise.all(entity_promises)) ?? []
  const query_vectors = await generate_embeddings(query)
  let user_query: {
    entity_hash: string
    chunk_hash: string
    chunk_text: string
    distance: number
  }[]

  if (results.length === 0) {
    console.log('je dois e^tre dans ce cas la')

    user_query = db_instance
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
  } else {
    user_query = db_instance
      .prepare(
        `
    SELECT chunk_text, chunk_hash, entity_hash, distance
    FROM vectors
    WHERE chunk_vector MATCH ?
    AND k = 10
    AND entity_hash IN (${_.flattenDeep(results)
      .map(() => '?')
      .join(', ')})
    `
      )
      .all(new Float32Array(query_vectors), ..._.flattenDeep(results)) as unknown as {
      entity_hash: string
      chunk_hash: string
      chunk_text: string
      distance: number
    }[]
  }

  // Step 3. Look for

  // console.debug(entity_query)
  // console.debug(relevant_entities)
  // console.debug(user_query)

  return user_query
}

//
//
// Get relevant entities
export const get_relevant_entities = async ({ threshold, entity, db }) => {
  const entity_vectors = await generate_embeddings(entity)
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

  //
  // Step 2. Make an array
  const relevant_entities = _.chain(entity_query)
    .filter((item) => item.distance < threshold)
    .uniqBy('entity_hash')
    .map('entity_hash')
    .value()

  return relevant_entities
}

//
//
//
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

//
//
//
// Generate the entity embedding
export const generate_embeddings = async (string: string) => {
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-large'),
    value: string
  })

  return embedding
}

//
//
//
// Calculate Cosine Similarity
// biome-ignore lint:
export const cosine_similarity = (vec1: any[], vec2: any[]) => {
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0)
  const magnitudeA = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0))
  const magnitudeB = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0))
  return dotProduct / (magnitudeA * magnitudeB)
}
