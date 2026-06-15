import { describe, expect, test } from 'bun:test'

import type { CopilotChunk } from '../../utils/copilot-agent'
import { copilotChunkToNdjson, ndjsonLine } from '../../utils/stream-to-ndjson'

describe('copilotChunkToNdjson', () => {
  test('maps delta', () => {
    const state = { needsBullet: true }
    expect([...copilotChunkToNdjson({ type: 'delta', content: 'hi' }, 'off', state)]).toEqual([
      { type: 'delta', content: 'hi' }
    ])
  })

  test('maps done', () => {
    const state = { needsBullet: true }
    expect([
      ...copilotChunkToNdjson(
        { type: 'done', fullContent: 'final', inputTokens: 1, outputTokens: 2 },
        'off',
        state
      )
    ]).toEqual([{ type: 'done', content: 'final' }])
  })

  test('filters reasoning when off', () => {
    const state = { needsBullet: true }
    const chunk: CopilotChunk = {
      type: 'reasoning_delta',
      content: 'think',
      source: 'reasoning'
    }
    expect([...copilotChunkToNdjson(chunk, 'off', state)]).toEqual([])
  })

  test('ndjsonLine appends newline', () => {
    expect(ndjsonLine({ type: 'error' })).toBe('{"type":"error"}\n')
  })
})
