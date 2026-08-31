function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Minimal markdown → HTML string for workflow stream preview (no Streamdown).
 * Supports paragraphs, bold, italic, and bullet lists.
 *
 * The output is injected with `dangerouslySetInnerHTML`, so every line is escaped
 * before the inline substitutions run: the only tags in the result are the ones
 * emitted here. Adding a construct that builds an attribute (a link, an image)
 * would break that and would need DOMPurify instead.
 */
export function markdownToStreamHtml(md: string): string {
  if (!md.trim()) return ''

  const lines = md.split('\n')
  const parts: string[] = []
  let inList = false

  const closeList = () => {
    if (inList) {
      parts.push('</ul>')
      inList = false
    }
  }

  const inline = (line: string) =>
    escapeHtml(line)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')

  for (const raw of lines) {
    const line = raw.trimEnd()
    const bullet = /^[-*]\s+(.+)$/.exec(line)
    if (bullet) {
      if (!inList) {
        parts.push('<ul>')
        inList = true
      }
      parts.push(`<li>${inline(bullet[1])}</li>`)
      continue
    }

    closeList()
    if (!line.trim()) continue
    parts.push(`<p>${inline(line)}</p>`)
  }

  closeList()
  return parts.join('')
}
