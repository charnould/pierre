import type Database from 'bun:sqlite'
import _ from 'lodash'
import { z } from 'zod'
import { generate_hash } from '../../utils/knowledge/generate-hash'
import { db } from '../database'
import { generate_embeddings_with_ollama } from '../search-by-vectors'
import type { Knowledge } from './_run'

/**
 * Generates embeddings for the provided knowledge object.
 *
 * This function generates and saves embeddings for both `community` and `proprietary` knowledge types.
 * It queries the database for chunks and processes them accordingly.
 *
 * @param {Knowledge} knowledge - The knowledge object containing information about the type of knowledge.
 * @returns {Promise<void>} A promise that resolves when the embeddings have been successfully generated.
 *
 * @throws Will log an error message if the embeddings generation fails.
 */
export const generate_embeddings = async (knowledge: Knowledge): Promise<void> => {
  try {
    // Generate and save `community` embeddings
    if (knowledge.community === true) {
      const database = db('community')
      const query = database.query('SELECT * FROM chunks;').all() as Chunk[]
      await go(query, database)
    }

    // Generate and save `proprietary.private/public` embeddings
    if (knowledge.proprietary === true) {
      let database: Database
      let query: Chunk[]

      // Handle `proprietary.private`
      database = db('proprietary.private')
      query = database.query('SELECT * FROM chunks;').all() as Chunk[]
      await go(query, database)

      // Handle `proprietary.public`
      database = db('proprietary.public')
      query = database.query('SELECT * FROM chunks;').all() as Chunk[]
      await go(query, database)
    }

    console.log('✅ embeddings computed')
    console.log('✅ knowledge rebuilt!')
    return
  } catch (e) {
    console.log('🆘 embeddings computing failed')
    console.log(e)
  }
}

/**
 * Processes an array of text chunks, generates embeddings for each chunk, and inserts them into the database.
 *
 * @param query - An array of `Chunk` objects, each containing text to be processed.
 * @param database - The `Database` instance where the embeddings will be stored.
 * @returns A promise that resolves when all chunks have been processed and inserted into the database.
 */
const go = async (query: Chunk[], database: Database) => {
  for await (const c of query) {
    const to = performance.now()
    const chunk_vector = await generate_embeddings_with_ollama([c.chunk_text], false)
    const t1 = performance.now()
    console.log(t1 - to, 'ms')

    if (chunk_vector.error) {
      console.error(chunk_vector.error)
    } else {
      database
        .prepare(
          `
          INSERT INTO vectors (chunk_hash, chunk_text, chunk_vector)
          VALUES (?, ?, vec_f32(?))
          `
        )
        .run(generate_hash(c.chunk_text), c.chunk_text, new Float32Array(chunk_vector))
    }
  }
  return
}

/**
 * Represents a chunk of text with associated metadata.
 *
 * @property {string} chunk_hash - A unique hash identifying the chunk.
 * @property {string} chunk_text - The actual text content of the chunk.
 * @property {string} chunk_stem - The stemmed version of the chunk text.
 */
export const Chunk = z.object({
  chunk_hash: z.string(),
  chunk_text: z.string(),
  chunk_stem: z.string()
})

export type Chunk = z.infer<typeof Chunk>
