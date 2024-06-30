import { db } from '../utils/database'

export const keyword_search = (keywords) => {
  try {
    return db('knowledge')
      .prepare("SELECT *, rank AS score, 'keywords' as type FROM chunks WHERE chunks MATCH ? ORDER BY rank LIMIT 10;")
      .all(keywords.join('* '))
  } catch (err) {
    console.error(err)
    return
  }
}
