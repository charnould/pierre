import { describe, expect, it } from 'bun:test'

import { createStreamBatcher } from './batcher'

describe('createStreamBatcher', () => {
  it('coalesces chunks and flushes after the interval', async () => {
    const emitted: string[] = []
    const batcher = createStreamBatcher((chunk) => emitted.push(chunk), 10)

    batcher.push('a')
    batcher.push('b')
    expect(emitted).toEqual([])

    await new Promise((r) => setTimeout(r, 15))
    expect(emitted).toEqual(['ab'])
  })

  it('flush sends buffered bytes immediately', () => {
    const emitted: string[] = []
    const batcher = createStreamBatcher((chunk) => emitted.push(chunk), 10_000)

    batcher.push('tail')
    batcher.flush()
    expect(emitted).toEqual(['tail'])
  })
})
