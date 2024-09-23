import { openai } from '@ai-sdk/openai'
import { embed } from 'ai'
import { db } from '../utils/database'

export const vector_search = async (data) => {
  const results = []

  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-large'),
    value: data
  })

  const vectors = db('knowledge')
    .prepare(
      `
    SELECT rowid, distance
    FROM vectors
    WHERE vector MATCH ? AND k = 4
    `
    )
    .all(new Float32Array(embedding))

  for (const v of vectors) {
    const test = db('knowledge').prepare('SELECT * FROM chunks WHERE rowid = ?;').get(v.rowid)
    results.push({ ...v, ...test })
  }

  try {
    return results
  } catch (err) {
    console.error(err)
    return
  }
}
