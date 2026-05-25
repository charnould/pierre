export function resolveAravisLoginUrl(
  aravisLoginUrl: string | undefined,
  ticketUrlPattern: string | undefined
): string | undefined {
  const explicit = aravisLoginUrl?.trim()
  if (explicit) return explicit

  const pattern = ticketUrlPattern?.trim()
  if (!pattern) return undefined

  const withoutQuery = pattern
    .split('?')[0]
    ?.replace(/\{id_reclamation\}/g, '')
    .trim()
  if (!withoutQuery) return undefined

  try {
    return new URL(withoutQuery).href.replace(/\/$/, '')
  } catch {
    return undefined
  }
}

export function aravisLoginOrigin(loginUrl: string): string | null {
  try {
    return new URL(loginUrl.trim()).origin
  } catch {
    return null
  }
}
