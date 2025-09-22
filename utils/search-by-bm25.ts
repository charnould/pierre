import type { AIContext } from './_schema'
import type { Db_Name } from './database'
import { db } from './database'
import { SResults } from './search-by-vectors'
import { stem } from './stem-text'

// TODOs:
// implement `carry` stemmer
// waht about `Fine-Tune BM25 Hyperparameters` (chunk length is irrelevant)
export const bm25_search = (keyword: string, context: AIContext) => {
  try {
    // Retrieve knowledge access permissions for the current context
    // (e.g., default, team, etc.) + Set a default for TS happiness
    let k = { community: true, proprietary: false }
    if (typeof context.config !== 'string') k = context.config.knowledge

    // Initialize the bm25 search results (format
    // must be the same as SResults)
    const r: SResults = { community: [], proprietary: [] }

    // Perform searches based on knowledge access
    if (k.community) r.community = query_db({ db_name: 'community', keyword: keyword })
    if (k.proprietary)
      r.proprietary = query_db({
        db_name: 'proprietary',
        keyword: keyword,
        chunk_access: context.config.id
      })

    // Parse results and return them to ensure
    // TypeScript types align with the schema
    return SResults.parse(r)
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
export const query_db = ({
  db_name,
  keyword,
  chunk_access = 'community'
}: {
  db_name: Db_Name
  keyword: string
  chunk_access?: string
}) => {
  const stemmed_keywords = stem(keyword)
  if (!stemmed_keywords) return []

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
        AND c.chunk_access = ?
        ORDER BY distance
        LIMIT 4;
      `
    )
    .all(stemmed_keywords, chunk_access) as {
    chunk_hash: string
    chunk_access: string
    chunk_text: string
    distance: number
  }[]

  return data
}
