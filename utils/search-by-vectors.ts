import { openai } from '@ai-sdk/openai'
import { embed } from 'ai'
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

    // Generate the embedding for the user’s query
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-large'),
      value: query
    })

    // Perform searches based on knowledge access
    if (k.community) r.community = query_db('community', new Float32Array(embedding))
    if (k.proprietary.public) r.public = query_db('proprietary.public', new Float32Array(embedding))
    if (k.proprietary.private)
      r.private = query_db('proprietary.private', new Float32Array(embedding))

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
const query_db = (db_name: Db_Name, embedding: Float32Array) => {
  const db_instance = db(db_name)
  const results = db_instance
    .prepare('SELECT rowid, distance FROM vectors WHERE vector MATCH ? AND k = 10')
    .all(embedding) as { rowid: number; distance: number }[]

  return results.map((result) => ({
    ...result,
    ...(db_instance.prepare('SELECT * FROM chunks WHERE rowid = ?;').get(result.rowid) as {
      rowid: number
      chunk: string
    })
  }))
}

// prettier-ignore
// biome-ignore format: readability
// Typescript Type via Zod
export const Vector_Search_Result = z.object({

  community : z.array(z.object({
    rowid     : z.number(),
    distance  : z.number(),
    chunk     : z.string()  })).default([]),

  private   : z.array(z.object({
    rowid     : z.number(),
    distance  : z.number(),
    chunk     : z.string()  })).default([]),

  public    : z.array(z.object({
    rowid     : z.number(),
    distance  : z.number(),
    chunk     : z.string()  })).default([])
    
})

export type Vector_Search_Result = z.infer<typeof Vector_Search_Result>
