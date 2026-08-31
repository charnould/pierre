/** Strip tags for notification / menu titles from report HTML. */
export function extractReportTitle(report: string, fallback: string): string {
  const trimmed = report.trim()
  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(trimmed)
  if (h1) {
    const text = h1[1].replace(/<[^>]+>/g, '').trim()
    if (text) return text
  }
  const md = /^#\s+(.+)$/m.exec(trimmed)
  return md?.[1].trim() ?? fallback
}
