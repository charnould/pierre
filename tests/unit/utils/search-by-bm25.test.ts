import { expect, test } from 'bun:test'
import { query_db } from '../../../utils/search-by-bm25'

test('should bm25 search works', async () => {
  const context = (await import('../../../tests/unit/utils/__mocks__/ai_context.json')).default
  context.current_context = 'default'

  // "problème de voisinage", "règlement de conflit",
  // "conseils voisinage", "médiation", "relations de voisinage"

  const r = query_db('community', 'Valérie Létard, née le 13 octobre 1962')

  expect(r).toMatchSnapshot()
})
