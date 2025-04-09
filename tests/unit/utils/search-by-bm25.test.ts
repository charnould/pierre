import { expect, it } from 'bun:test'
import { query_db } from '../../../utils/search-by-bm25'

it('should search using bm25', async () => {
  const r = query_db('community', 'Valérie Létard, née le 13 octobre 1962')
  expect(r).toMatchSnapshot()
})
