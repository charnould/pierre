import { string } from 'zod'
import type { AIContext } from './_schema'
import { db } from './database'
import type { Db_Name } from './database'
import { Vector_Search_Result } from './search-by-vectors'
import { stem } from './stem-text'

// TODO: implement `carry` stemmer
// TODO: waht about `Fine-Tune BM25 Hyperparameters` (chunk length is irrelevant)
export const bm25_search = (keyword: string, context: AIContext) => {
  try {
    console.log(keyword)
    // Retrieve knowledge access permissions for the current context
    // (e.g., default, team, etc.) + Set a default for TS happiness
    let k = { community: true, proprietary: { public: false, private: false } }
    if (typeof context.config !== 'string') k = context.config.knowledge

    // Initialize the bm25 search results (format
    // must be the same as Vector_Search_Result)
    const r: Vector_Search_Result = { community: [], private: [], public: [] }

    // Perform searches based on knowledge access
    if (k.community) r.community = query_db('community', keyword)
    if (k.proprietary.public) r.public = query_db('proprietary.public', keyword)
    if (k.proprietary.private) r.private = query_db('proprietary.private', keyword)

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
// Query the database with the keyword to retrieve the matching chunks
export const query_db = (db_name: Db_Name, keyword: string) => {
  const stemmed_keywords = stem(keyword)

  if (stemmed_keywords !== '') {
    // The rank column is the negative bm25 score
    // https://www.sqlite.org/fts5.html#:~:text=The%20%22%2D1%22%20term,numerically%20lower%20scores.
    // https://alexgarcia.xyz/blog/2024/sqlite-vec-hybrid-search/index.html
    const data = db(db_name)
      .prepare(
        `
        SELECT
          c.chunk_hash,
          c.chunk_text,
          s.rank AS distance
        FROM stems s 
        JOIN chunks c ON s.rowid = c.rowid
        WHERE s.chunk_stem MATCH ?
        ORDER BY distance
        LIMIT 15;
      `
      )
      .all(stemmed_keywords) as {
      chunk_hash: string
      chunk_text: string
      distance: number
    }[]

    return data
  }

  return []
}
