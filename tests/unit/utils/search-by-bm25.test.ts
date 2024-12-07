import { expect, test } from 'bun:test'
import { query_db } from '../../../utils/search-by-bm25'

test('should bm25 search works', async () => {
  const context = (await import('../../../tests/unit/utils/__mocks__/ai_context.json')).default
  context.current_context = 'default'
  const r = query_db('proprietary.private', 'Henri Becquerel')

  expect(r).toMatchSnapshot()
})
