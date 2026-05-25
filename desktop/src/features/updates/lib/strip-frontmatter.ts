/** Removes YAML frontmatter block at the start of a markdown file. */
export function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
}

/** Removes a leading `# Title` line — title is shown separately in the reader chrome. */
export function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^\s*#\s+.+\r?\n+/, '')
}
