import { describe, expect, test } from 'bun:test'

import { dictationWave } from './DictationMark'

describe('dictationWave', () => {
  test('opens the bars as the voice gets louder', () => {
    expect(dictationWave(0)).toBe('0')
    expect(dictationWave(0.12)).toBe('1')
    expect(dictationWave(0.34)).toBe('2')
    expect(dictationWave(0.56)).toBe('3')
    expect(dictationWave(0.78)).toBe('4')
  })
})
