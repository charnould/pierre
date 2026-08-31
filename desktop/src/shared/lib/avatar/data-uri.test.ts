import { describe, expect, test } from 'bun:test'

import { bytesToDataUri } from './data-uri'

describe('bytesToDataUri', () => {
  test('prefixes base64 bytes with the given mime', () => {
    expect(bytesToDataUri(new Uint8Array([1, 2, 3]), 'image/webp')).toBe(
      `data:image/webp;base64,${btoa('\x01\x02\x03')}`
    )
  })
})
