import _ from 'lodash'
import { z } from 'zod'
import { db } from '../utils/database'
import type { Db_Name } from '../utils/database'
import type { AIContext } from './_schema'

/**
 * Performs a vector search based on the provided embedding and context.
 *
 * This function retrieves knowledge access permissions from the given context
 * and performs searches across different knowledge bases (community, public, private)
 * depending on the access permissions. The results are parsed and returned
 * in a structured format.
 *
 * @param embedding - An array of numbers representing the vector embedding to search with.
 * @param context - The AIContext object containing configuration and permissions for the search.
 *
 * @returns A promise that resolves to a `Vector_Search_Result` object containing
 *          the search results for community, public, and private knowledge bases.
 *          Returns `undefined` if an error occurs during the search process.
 *
 * @throws Will log an error to the console if an exception is encountered.
 */
export const vector_search = async (embedding: number[], context: AIContext) => {
  try {
    // Retrieve knowledge access permissions for the current context
    // (e.g., default, team, etc.) + Set a default for TS happiness
    let k = { community: true, proprietary: { public: false, private: false } }

    if (typeof context.config !== 'string' && 'context' in context.config) {
      k = context.config.knowledge
    }

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

/**
 * Queries a database using a provided embedding vector and returns the search results.
 *
 * @param db_name - The name of the database to query.
 * @param embedding - An array of numbers representing the embedding vector for the query.
 * @returns A promise that resolves to the search results from the database.
 */
export const query_db = async (db_name: Db_Name, embedding: number[]) => {
  const db_instance = db(db_name)
  const user_query = search(embedding, db_instance)
  return user_query
}

// TODO: remove from schema and DB entites hash & cie

/**
 * Generates embeddings for the given strings using the Ollama API.
 *
 * @param strings - An array of strings for which embeddings need to be generated.
 * @param batch - A boolean indicating whether to return all embeddings as a batch.
 *                If `true`, returns an array of embeddings for all input strings.
 *                If `false`, returns the embedding for the first input string.
 * @returns A promise that resolves to the generated embeddings. The return type
 *          depends on the `batch` parameter:
 *          - If `batch` is `true`, resolves to an array of embeddings.
 *          - If `batch` is `false`, resolves to a single embedding.
 * @throws An error if the embedding generation fails.
 */
export const generate_embeddings_with_ollama = async (strings: string[], batch: boolean) => {
  try {
    const response = await fetch('http://localhost:11434/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'bge-m3', input: strings })
    })

    const data = await response.json()

    if (batch === true) return data.embeddings
    return data.embeddings[0]
  } catch (e) {
    console.error(e)
    throw new Error('Embeddings generation failed.')
  }
}

/**
 * Searches for the top 10 closest matches in the database based on the provided query vectors.
 *
 * @param query_vectors - An array of query vectors represented as numbers, used to find similar entries in the database.
 * @param database - The database instance used to execute the search query.
 * @returns An array of objects containing the following properties:
 * - `chunk_hash`: A string representing the unique hash of the matched chunk.
 * - `chunk_text`: A string containing the text of the matched chunk.
 * - `distance`: A number representing the distance between the query vector and the matched chunk vector.
 *
 * @remarks
 * This function uses a prepared SQL query to search for matches in a table named `vectors`.
 * The `MATCH` clause is used to compare the `chunk_vector` column with the provided query vectors.
 * The `k = 10` condition ensures that only the top 10 closest matches are returned.
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

/**
 * Represents the result of a vector search operation.
 *
 * This object contains three categories of search results: `community`, `private`, and `public`.
 * Each category is an array of objects, where each object represents a search result with the following properties:
 *
 * - `chunk_hash` (string): A unique identifier for the chunk.
 * - `chunk_text` (string): The text content of the chunk.
 * - `distance` (number): The distance metric indicating the similarity of the chunk to the search query.
 *
 * All categories default to an empty array if no results are found.
 */
export const Vector_Search_Result = z.object({
  community: z
    .array(
      z.object({
        chunk_hash: z.string(),
        chunk_text: z.string(),
        distance: z.number()
      })
    )
    .default([]),

  private: z
    .array(
      z.object({
        chunk_hash: z.string(),
        chunk_text: z.string(),
        distance: z.number()
      })
    )
    .default([]),

  public: z
    .array(
      z.object({
        chunk_hash: z.string(),
        chunk_text: z.string(),
        distance: z.number()
      })
    )
    .default([])
})

export type Vector_Search_Result = z.infer<typeof Vector_Search_Result>

//
//
//
//
//
// TODO
//
//
//
//
//
// export const generate_embeddings_with_hf = async (text: string) => {
//   try {
//     const to = performance.now()
//     // const inference = new HfInference() // your user token
//     // const gpt2 = inference.endpoint('https://mxqyt9ov9pyamzhy.eu-west-1.aws.endpoints.huggingface.cloud')
//     // const { generated_text } = await gpt2.textGeneration({ inputs: 'The answer to the universe is' })
//     const response = await fetch(
//       'https://qo5dgr4yicgr9snx.us-east4.gcp.endpoints.huggingface.cloud',
//       {
//         headers: {
//           Accept: 'application/json',
//           'Content-Type': 'application/json'
//         },
//         method: 'POST',
//         body: JSON.stringify({
//           inputs: text,
//           parameters: {}
//         })
//       }
//     )

//     const result = await response.json()
//     const t1 = performance.now()
//     console.log(t1 - to, 'ms')

//     if (result.error) {
//       return result
//     }
//     return result[0]
//   } catch (e) {
//     console.error(e)
//     console.error('?', text, '?')
//   }
// }
