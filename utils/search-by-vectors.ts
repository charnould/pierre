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
 * Generates embeddings for a given array of strings using the specified provider.
 *
 * @param strings - An array of strings for which embeddings need to be generated.
 * @param options - Configuration options for the embedding generation.
 * @param options.provider - The provider to use for generating embeddings.
 *                            Can be either 'ollama' (local) or 'huggingface'.
 * @param options.batch - A boolean indicating whether to process the strings in batch mode.
 *                        Applicable only when the provider is 'ollama'.
 * @returns A promise that resolves to the generated embeddings or an error object.
 *          - For 'ollama' with `batch: true`, returns an array of embeddings.
 *          - For 'ollama' with `batch: false`, returns a single embedding.
 *          - For 'huggingface', returns the first embedding from the result.
 * @throws An error if the response from the provider contains an error or if the fetch fails.
 */
export const generate_embeddings = async (
  strings: string[],
  options: { provider: 'ollama' | 'huggingface'; batch: boolean }
) => {
  try {
    let response: Response | undefined

    // Option 1: Ollama (= local)
    if (options.provider === 'ollama') {
      const url =
        Bun.env.NODE_ENV === 'production'
          ? 'http://ollama:11434/api/embed'
          : 'http://localhost:11434/api/embed'

      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'bge-m3', input: strings })
      })
    }

    // Option 2: Hugging Face
    if (options.provider === 'huggingface') {
      response = await fetch(Bun.env.HUGGINGFACE_ENDPOINT as string, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Bun.env.HUGGINGFACE_TOKEN}`
        },
        method: 'POST',
        body: JSON.stringify({ inputs: strings[0] })
      })
    }

    if (!response) throw new Error('Failed to fetch response from the provider.')

    const result = await response.json()

    if (result.error) throw new Error(result.error)
    if (options.provider === 'ollama' && options.batch === true) return result.embeddings
    if (options.provider === 'ollama' && options.batch === false) return result.embeddings[0]
    if (options.provider === 'huggingface') return result[0]
  } catch (error) {
    return { error }
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
      AND k = 5
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

/**
 * Ensures that the Ollama service is running and the specified models are preloaded.
 *
 * This function sends a POST request to the Ollama API to verify its availability
 * and preload the `bge-m3` model. If the service is not running, it logs an error
 * message and terminates the process with an exit code of 1.
 *
 * The API endpoint used depends on the environment:
 * - In production: `http://ollama:11434/api/embed`
 * - In development: `http://localhost:11434/api/embed`
 *
 * @throws Will terminate the process if the Ollama service is not running.
 */
export const ensure_ollama_is_running_and_models_preloaded = async () => {
  const request = JSON.stringify({ model: 'bge-m3', keep_alive: -1 })
  const ERROR = 'Ollama is not running.'
  const url =
    Bun.env.NODE_ENV === 'production'
      ? 'http://ollama:11434/api/embed'
      : 'http://localhost:11434/api/embed'

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: request
  }).catch(() => {
    console.error(ERROR)
    process.exit(1)
  })
}
