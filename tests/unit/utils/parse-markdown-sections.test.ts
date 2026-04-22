import { describe, expect, it } from 'bun:test'

import { parse_markdown_sections } from '../../../utils/parse-markdown-sections'

const fixture = new URL('./__mocks__/parse-markdown-sections.md', import.meta.url)

describe('parse_markdown_sections', () => {
  it('should return an object with H1 titles as keys', async () => {
    const result = await parse_markdown_sections(fixture.pathname)
    expect(Object.keys(result)).toEqual(['identity', 'tone', 'guidelines', 'empty_section'])
  })

  it('should lowercase keys regardless of original casing', async () => {
    const result = await parse_markdown_sections(fixture.pathname)
    expect(result).toHaveProperty('identity')
    expect(result).toHaveProperty('tone')
    expect(result).toHaveProperty('guidelines') // originally "GUIDELINES"
  })

  it('should return section content as trimmed string', async () => {
    const result = await parse_markdown_sections(fixture.pathname)
    expect(result.identity).toBe('You are a helpful assistant.')
    expect(result.tone).toBe('Be concise and clear.')
    expect(result.guidelines).toBe('_Always cite sources._')
  })

  it('should return an empty string for empty sections', async () => {
    const result = await parse_markdown_sections(fixture.pathname)
    expect(result.empty_section).toBe('')
  })
})
