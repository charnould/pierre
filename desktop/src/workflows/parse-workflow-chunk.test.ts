import { describe, expect, test } from 'bun:test'

import { parseAiStreamLine } from './parse-workflow-chunk'

describe('parseAiStreamLine', () => {
  test('parses delta', () => {
    expect(parseAiStreamLine('{"type":"delta","content":"hi"}')).toEqual({
      type: 'delta',
      content: 'hi'
    })
  })

  test('parses reasoning_delta', () => {
    expect(parseAiStreamLine('{"type":"reasoning_delta","content":"think"}')).toEqual({
      type: 'reasoning_delta',
      content: 'think'
    })
  })

  test('parses done', () => {
    expect(parseAiStreamLine('{"type":"done","content":"final"}')).toEqual({
      type: 'done',
      content: 'final'
    })
  })

  test('parses reset', () => {
    expect(parseAiStreamLine('{"type":"reset"}')).toEqual({ type: 'reset' })
  })

  test('returns null for empty line', () => {
    expect(parseAiStreamLine('   ')).toBeNull()
  })

  test('rejects delta without content', () => {
    expect(parseAiStreamLine('{"type":"delta"}')).toBeNull()
    expect(parseAiStreamLine('{"type":"delta","content":""}')).toBeNull()
  })

  test('rejects unknown event types', () => {
    expect(parseAiStreamLine('{"type":"unknown","content":"x"}')).toBeNull()
  })

  test('maps pierre_error substring to error', () => {
    expect(parseAiStreamLine('not json but pierre_error occurred')).toEqual({ type: 'error' })
  })
})
