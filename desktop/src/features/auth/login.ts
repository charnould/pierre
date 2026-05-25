/** Electron webRequest exposes Set-Cookie as lowercase string arrays. */
export function pierreCookieLinesFromWebHeaders(
  headers: Record<string, string[] | string | undefined> | undefined
): string[] {
  if (!headers) return []
  const raw = headers['set-cookie'] ?? headers['Set-Cookie']
  if (!raw) return []
  return Array.isArray(raw) ? raw : [raw]
}
