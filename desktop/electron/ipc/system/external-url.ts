const ALLOWED_PROTOCOLS = new Set(['https:', 'mailto:'])

/** Autorise uniquement les schémas sûrs pour `shell.openExternal`. */
export function isAllowedExternalUrl(raw: unknown): boolean {
  if (typeof raw !== 'string') return false
  const trimmed = raw.trim()
  if (!trimmed) return false
  try {
    return ALLOWED_PROTOCOLS.has(new URL(trimmed).protocol)
  } catch {
    return false
  }
}
