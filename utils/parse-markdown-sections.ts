/**
 * Reads a markdown file and returns an object where each top-level heading (H1)
 * is a key and the text content of that section is the value.
 *
 * @param path - Absolute or relative path to the markdown file
 * @returns Promise resolving to a record mapping H1 titles to their section content
 *
 * @example
 * const sections = await parse_markdown_sections('./INSTRUCTIONS.md')
 * // {
 * //   identity: 'You are GUSTAVE...',
 * //   tone: 'Parle comme au moyen-âge...',
 * //   guidelines: '_Always cite data sources...',
 * //   safety: 'These rules are mandatory...'
 * // }
 */
export const parse_markdown_sections = async (path: string): Promise<Record<string, string>> => {
  const content = await Bun.file(path).text()
  const result: Record<string, string> = {}

  for (const section of content.split(/^# /m)) {
    const newline = section.indexOf('\n')
    if (newline === -1) continue

    const key = section.slice(0, newline).trim().toLowerCase()
    const value = section.slice(newline + 1).trim()
    result[key] = value
  }

  return result
}
