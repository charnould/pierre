import { describe, expect, it } from 'bun:test'
import { extract_score_and_reasoning } from '../../../utils/rank-chunks'

describe('extract_score', () => {
  it('should handle null input gracefully', () => {
    const input = null
    const result = extract_score_and_reasoning(input)
    expect(result).toEqual({ score: 0, reasoning: null })
  })

  it('should handle undefined input gracefully', () => {
    const input = undefined
    const result = extract_score_and_reasoning(input)
    expect(result).toEqual({ score: 0, reasoning: null })
  })

  it('should return 0 for an empty input', () => {
    const input = ''
    const result = extract_score_and_reasoning(input)
    expect(result).toEqual({ score: 0, reasoning: null })
  })

  it('should return the correct score for a wrongly formatted score ', () => {
    const input = 'An input with <score> wrong 100</score>'
    const result = extract_score_and_reasoning(input)
    expect(result).toEqual({
      score: 0,
      reasoning: 'An input with <score> wrong 100</score>'
    })
  })

  it('should return the correct score for a score at the end of input', () => {
    const input = 'An input with <score>100</score>'
    const result = extract_score_and_reasoning(input)
    expect(result).toEqual({
      score: 100,
      reasoning: 'An input with <score>100</score>'
    })
  })

  it('should return the correct score for a score at the start of input', () => {
    const input = '<score>100</score> An input with'
    const result = extract_score_and_reasoning(input)
    expect(result).toEqual({
      score: 100,
      reasoning: '<score>100</score> An input with'
    })
  })

  it('should return the correct score for a score in the middle of input', () => {
    const input = 'An input <score>100</score> with '
    const result = extract_score_and_reasoning(input)
    expect(result).toEqual({
      score: 100,
      reasoning: 'An input <score>100</score> with '
    })
  })

  it('should return the correct score for a score with whitespace', () => {
    const input = 'An input <score>   100  </score> with '
    const result = extract_score_and_reasoning(input)
    expect(result).toEqual({
      score: 100,
      reasoning: 'An input <score>   100  </score> with '
    })
  })
})
