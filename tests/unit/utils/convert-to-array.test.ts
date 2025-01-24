import { describe, expect, it } from 'bun:test'
import { convert_to_array } from '../../../utils/convert-to-array'

describe('convert_to_array', () => {
  it('should convert text into an array of trimmed strings', () => {
    const input = '  hello  |  world  |  '
    const expected = ['hello', 'world']
    expect(convert_to_array(input)).toEqual(expected)
  })

  it('should remove empty strings from the result', () => {
    const input = '  hello  ||  world  |  '
    const expected = ['hello', 'world']
    expect(convert_to_array(input)).toEqual(expected)
  })

  it('should handle text with newline characters', () => {
    const input = '  hello\n  |  world\n  |  '
    const expected = ['hello', 'world']
    expect(convert_to_array(input)).toEqual(expected)
  })

  it('should return an empty array for an empty input string', () => {
    const input = ''
    const expected = []
    expect(convert_to_array(input)).toEqual(expected)
  })

  it('should handle text with multiple consecutive delimiters', () => {
    const input = '  hello  |||  world  |  '
    const expected = ['hello', 'world']
    expect(convert_to_array(input)).toEqual(expected)
  })

  it('should handle text with only delimiters', () => {
    const input = '|||'
    const expected = []
    expect(convert_to_array(input)).toEqual(expected)
  })

  it('should handle text with no delimiter', () => {
    const input = 'hello'
    const expected = ['hello']
    expect(convert_to_array(input)).toEqual(expected)
  })
})
