import { expect, it } from 'bun:test'
import { query_db } from '../../../utils/search-by-bm25'

it('should search using bm25 and find a result', async () => {
  const q = query_db({
    db_name: 'community',
    keyword: 'Valérie Létard, née le 13 octobre 1962',
    chunk_access: 'community'
  })
  expect(q).toMatchSnapshot()
})

it('should search using bm25 and find no result', async () => {
  const q = query_db({
    db_name: 'community',
    keyword: 'Valérie Létard, née le 13 octobre 1962',
    chunk_access: 'not-an-access'
  })
  expect(q).toStrictEqual([])
})
