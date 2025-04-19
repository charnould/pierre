import type Database from 'bun:sqlite'
import _ from 'lodash'
import { z } from 'zod'
import { db } from '../database'
import { generate_embeddings } from '../search-by-vectors'
import type { Knowledge } from './_run'
import { generate_hash } from './generate-hash'

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
export const generate_vectors = async (knowledge: Knowledge): Promise<void> => {
  try {
    // Generate and save `community` embeddings
    if (knowledge.community === true) {
      const database = db('community')
      const query = database.query('SELECT * FROM chunks;').all() as Chunk[]
      await go(query, database, knowledge)
    }

    // Generate and save `proprietary.private/public` embeddings
    if (knowledge.proprietary === true) {
      let database: Database
      let query: Chunk[]

      // Handle `proprietary.private`
      database = db('proprietary.private')
      query = database.query('SELECT * FROM chunks;').all() as Chunk[]
      await go(query, database, knowledge)

      // Handle `proprietary.public`
      database = db('proprietary.public')
      query = database.query('SELECT * FROM chunks;').all() as Chunk[]
      await go(query, database, knowledge)
    }

    console.log('✅ embeddings computed')
    console.log('✅ knowledge rebuilt!')
    return
  } catch (e) {
    console.log('🆘 embeddings computing failed', e)
  }
}

/**
 * Processes an array of text chunks, generates embeddings
 * for each chunk, and inserts them into the database.
 *
 * @param query - An array of `Chunk` objects, each containing text to be processed.
 * @param database - The `Database` instance where the embeddings will be stored.
 * @returns A promise that resolves when all chunks have been processed and inserted into the database.
 */
const go = async (query: Chunk[], database: Database, knowledge: Knowledge) => {
  for await (const c of query) {
    const to = performance.now()
    let chunk_vector: Promise<number[]>
    if (
      knowledge.proprietary === true &&
      Bun.env.HUGGINGFACE_ENDPOINT &&
      Bun.env.HUGGINGFACE_TOKEN
    ) {
      chunk_vector = await generate_embeddings([c.chunk_text], {
        provider: 'huggingface',
        batch: false
      })
    } else {
      chunk_vector = await generate_embeddings([c.chunk_text], { provider: 'ollama', batch: false })
    }
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
 * Asynchronously wakes up the GPU by sending a test request to the Hugging Face endpoint
 * until it responds successfully. This function ensures that the GPU is ready for processing.
 *
 * @throws {Error} Throws an error if the Hugging Face endpoint or token is invalid or missing.
 */
export const wake_up_gpu = async () => {
  try {
    // Check if the Hugging Face endpoint and token are provided
    // and valid. If not, throw an error.
    const endpoint = z.string().url().safeParse(Bun.env.HUGGINGFACE_ENDPOINT)
    const token = z.string().nonempty().safeParse(Bun.env.HUGGINGFACE_TOKEN)

    if (!endpoint.success) throw new Error('❌ Invalid/missing HF_ENDPOINT.')
    if (!token.success || token.data === 'null') throw new Error('❌ Invalid/missing HF_TOKEN.')

    // Check if the Hugging Face endpoint is reachable
    let is_awake = false

    while (is_awake === false) {
      const response = await generate_embeddings(['hi'], { provider: 'huggingface', batch: false })
      if (response.error) {
        console.log('💤 GPU is waking up. Retrying in 10 seconds.')
        await Bun.sleep(10000)
      } else {
        is_awake = true
        console.log('✅ GPU is awake and ready!')
        return
      }
    }
  } catch (e) {
    console.error('🆘 GPU initialization failed or configuration is incorrect.', e)
  }
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
