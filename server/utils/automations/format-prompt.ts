import { formatText } from '../format-text'

export async function format_automation_prompt(markdown: string): Promise<string> {
  const trimmed = markdown.trim()
  if (!trimmed) return ''
  return formatText('a.md', trimmed)
}
