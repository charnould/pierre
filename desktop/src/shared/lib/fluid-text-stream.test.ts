import { describe, expect, it } from 'bun:test'

import { buildQueuedUnits, computeTextDelta, splitStreamUnits } from './fluid-text-stream'

describe('computeTextDelta', () => {
  it('returns empty when texts match', () => {
    expect(computeTextDelta('hello', 'hello')).toBe('')
  })

  it('returns full next when prev is empty', () => {
    expect(computeTextDelta('', 'abc')).toBe('abc')
  })

  it('returns suffix after common prefix', () => {
    expect(computeTextDelta('Hello ', 'Hello world')).toBe('world')
  })

  it('returns full next on non-prefix replace', () => {
    expect(computeTextDelta('old', 'new text')).toBe('new text')
  })
})

describe('splitStreamUnits', () => {
  it('splits by word with trailing spaces', () => {
    expect(splitStreamUnits('foo bar ', 'word')).toEqual(['foo ', 'bar '])
  })

  it('preserves leading whitespace (space between streamed words)', () => {
    expect(splitStreamUnits(' tenant', 'word')).toEqual([' tenant'])
  })

  it('preserves leading newlines in delta', () => {
    expect(splitStreamUnits('\n\nhas ', 'word')).toEqual(['\n\nhas '])
  })

  it('splits by character', () => {
    expect(splitStreamUnits('ab', 'char')).toEqual(['a', 'b'])
  })
})

describe('buildQueuedUnits', () => {
  it('queues only new words', () => {
    const first = buildQueuedUnits('', 'Hello ')
    expect(first.units.map((u) => u.text)).toEqual(['Hello '])

    const second = buildQueuedUnits('Hello ', 'Hello world')
    expect(second.units.map((u) => u.text)).toEqual(['world'])
    expect(second.snapshot).toBe('Hello world')
  })
})
