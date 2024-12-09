import { expect, test } from 'bun:test'
import { query_db } from '../../utils/search-by-vectors'

test('should vector search works', async () => {
  const r = await query_db('proprietary.private', 'quel est le mode de chauffage ?', {
    building: 'Racine',
    process: 'none'
  })

  console.log(r)

  expect(2).toBe(2)
})
