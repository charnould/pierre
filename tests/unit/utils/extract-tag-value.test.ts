import { describe, expect, it } from 'bun:test'
import { extract_tag_value } from '../../../utils/augment-query'

describe('extract_tag_value', () => {
  it('should return the correct value for a given tag 1', () => {
    const result = extract_tag_value('<lang>fr</lang>', 'lang', 'fr')
    expect(result).toBe('fr')
  })

  it('should return the correct value for a given tag 2', () => {
    const result = extract_tag_value('some text <lang>fr</lang> some text', 'lang', 'fr')
    expect(result).toBe('fr')
  })

  it('should return fallback if the tag is not found', () => {
    const result = extract_tag_value(
      'some text <lang>fr</lang> some text <profanity>fr</profanity>',
      'test_tag',
      'fallback'
    )
    expect(result).toBe('fallback')
  })

  it('should handle empty input string', () => {
    const result = extract_tag_value('', 'lang', 'fallback')
    expect(result).toBe('fallback')
  })

  it('should handle input string without tags', () => {
    const result = extract_tag_value('a string without tags', 'lang', 'fallback')
    expect(result).toBe('fallback')
  })
})
