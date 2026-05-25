import { describe, expect, it } from 'bun:test'

import { aiChunkEventChannel } from '../channels'

describe('aiChunkEventChannel', () => {
  it('returns a request-scoped channel name', () => {
    expect(aiChunkEventChannel('req-1')).toBe('ai-chunk:req-1')
  })
})
