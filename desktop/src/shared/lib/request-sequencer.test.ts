import { describe, expect, test } from 'bun:test'

import { createRequestSequencer } from './request-sequencer'

describe('createRequestSequencer', () => {
  test('the only in-flight request is current', () => {
    const sequencer = createRequestSequencer()
    const token = sequencer.begin()
    expect(sequencer.isCurrent(token)).toBe(true)
  })

  test('starting a newer request makes the older one stale', () => {
    const sequencer = createRequestSequencer()
    const first = sequencer.begin()
    const second = sequencer.begin()

    expect(sequencer.isCurrent(first)).toBe(false)
    expect(sequencer.isCurrent(second)).toBe(true)
  })

  test('a stale token stays stale once it has been overtaken', () => {
    const sequencer = createRequestSequencer()
    const first = sequencer.begin()
    sequencer.begin()

    // This is the out-of-order case: the older request resolves last and must
    // still be rejected.
    expect(sequencer.isCurrent(first)).toBe(false)
  })

  test('each sequencer counts independently', () => {
    const a = createRequestSequencer()
    const b = createRequestSequencer()
    const tokenA = a.begin()
    b.begin()
    b.begin()

    expect(a.isCurrent(tokenA)).toBe(true)
    expect(b.isCurrent(tokenA)).toBe(false)
  })

  test('the older response loses when two requests resolve out of order', async () => {
    const sequencer = createRequestSequencer()
    const writes: string[] = []

    // Mirrors how `useTickets.reload` uses the sequencer: capture a token, await,
    // then refuse to write if a newer request has started meanwhile.
    const run = async (label: string, delayMs: number) => {
      const token = sequencer.begin()
      await new Promise((resolve) => setTimeout(resolve, delayMs))
      if (!sequencer.isCurrent(token)) return
      writes.push(label)
    }

    // 'slow-first' starts first but resolves last — the bug this guards against.
    await Promise.all([run('slow-first', 40), run('fast-second', 5)])

    expect(writes).toEqual(['fast-second'])
  })
})
