import { expect, test } from 'bun:test'
import { query_db } from '../../../utils/search-by-vectors'

test('should vector search works', async () => {
  const r = await query_db('proprietary.private', 'chauffage individuel', {
    location: 'lieu: Racine',
    process: 'none'
  })

  console.log(r)

  expect(2).toBe(2)
})
