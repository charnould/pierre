import type Database from 'bun:sqlite'
import { openai } from '@ai-sdk/openai'
import { embedMany } from 'ai'
import _ from 'lodash'
import { z } from 'zod'
import { generate_hash } from '../../utils/knowledge/generate-hash'
import { db } from '../database'
import type { Knowledge } from './_run'

export const generate_embeddings = async (knowledge: Knowledge) => {
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

//
//
//
//
// This function does the main job:
// (1) generate embeddings
// (2) save them in DB
const go = async (query: Chunk[], database: Database) => {
  for await (const group of _.chunk(query, 100)) {
    const chunk_texts = group.map((item) => item.chunk_text)
    const chunk_text_vectors = await get_embeddings(chunk_texts)

    const vectors = group.map((item, index) => ({
      chunk_vector: chunk_text_vectors[index],
      chunk_stem: item.chunk_stem,
      chunk_text: item.chunk_text
    }))

    for (const v of vectors) {
      database
        .prepare(
          `
          INSERT INTO vectors (chunk_hash, chunk_text, chunk_vector)
          VALUES (?, ?, vec_f32(?))
          `
        )
        .run(generate_hash(v.chunk_text), v.chunk_text, new Float32Array(v.chunk_vector))
    }
  }
  return
}

//
//
//
//
// Helper to generate embeddings
async function get_embeddings(data: string[]) {
  const { embeddings } = await embedMany({
    model: openai.embedding('text-embedding-3-large'),
    values: data
  })

  return embeddings
}

//
//
//
//
// Zod schema/TS type
export const Chunk = z.object({
  chunk_hash: z.string(),
  chunk_text: z.string(),
  chunk_stem: z.string()
})

export type Chunk = z.infer<typeof Chunk>
