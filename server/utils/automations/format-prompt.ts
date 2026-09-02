import { format } from 'oxfmt'

export async function format_automation_prompt(markdown: string): Promise<string> {
  const trimmed = markdown.trim()
  if (!trimmed) return ''
  const { code } = await format('a.md', trimmed)
  return code
}
