import { expect, it } from 'bun:test'
import { checksum_file, hash_filename } from '../../../utils/knowledge/generate-hash'

it('should hash a string', async () => {
  const to_hash = 'Bonjour'
  const hashed = 'kXLo7smfFE9y7KmlaHWV'
  expect(hash_filename(to_hash)).toStrictEqual(hashed)
})

it('should geneate a SHA-256 hash of a file', async () => {
  const file_to_hash = Bun.file('./assets/default/files/_metadata.xlsx')
  const data = await file_to_hash.arrayBuffer()
  const hashed = '4312a19df8274b400147512d5daf2ebffadbd0ad51ad06ceb0b97af43d41070c'
  expect(checksum_file(data)).toStrictEqual(hashed)
})
