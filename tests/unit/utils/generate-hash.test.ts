import { describe, expect, it } from 'bun:test'
import {
  decode_filename,
  encode_filename,
  generate_hash
} from '../../../utils/knowledge/generate-hash'

describe('generate_hash', () => {
  it('should hash a string', async () => {
    const to_hash = 'Bonjour'
    const hashed = 'kXLo7smfFE9y7KmlaHWV'
    expect(generate_hash(to_hash)).toStrictEqual(hashed)
  })
})

describe('encode/decode_filename', () => {
  it('should encode/decode filename', () => {
    const original_filename = "Carnet d'identité des immeubles.xlsx"
    const encoded = encode_filename(original_filename)
    const decoded = decode_filename(encoded)
    expect(encoded).toBe('Q2FybmV0IGQnaWRlbnRpdMOpIGRlcyBpbW1ldWJsZXM.xlsx')
    expect(decoded).toBe(original_filename)
  })

  it('should return error message', () => {
    const encoded = encode_filename("Carnet d'identité des immeubles.pptx")
    expect(encoded).toBe('extension_error')
  })
})
