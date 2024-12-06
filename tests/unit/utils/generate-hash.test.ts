import { expect, it } from 'bun:test'
import { generate_hash } from '../../../utils/knowledge/generate-hash'

it('should hash a string', async () => {
  const to_hash = 'Bonjour'
  const hashed = 'kXLo7smfFE9y7KmlaHWVgO2tss_RVIV_BZXVpSTvEQ'

  expect(generate_hash(to_hash)).toStrictEqual(hashed)
})
