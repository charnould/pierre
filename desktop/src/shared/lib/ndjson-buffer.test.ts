import { describe, expect, test } from 'bun:test'

import { createNdjsonLineBuffer } from './ndjson-buffer'

describe('createNdjsonLineBuffer', () => {
  test('splits across chunk boundaries', () => {
    const lines: string[] = []
    const buf = createNdjsonLineBuffer((line) => lines.push(line))

    buf.push('{"a":1}\n{"b":')
    buf.push('2}\n')
    buf.flush()

    expect(lines).toEqual(['{"a":1}', '{"b":2}'])
  })

  test('flush emits trailing partial line', () => {
    const lines: string[] = []
    const buf = createNdjsonLineBuffer((line) => lines.push(line))

    buf.push('tail')
    buf.flush()

    expect(lines).toEqual(['tail'])
  })
})
