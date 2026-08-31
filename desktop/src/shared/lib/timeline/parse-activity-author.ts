const ACTIVITY_AUTHOR_KINDS = [
  'user',
  'agent',
  'automation',
  'system',
  'tenant',
  'external',
  'candidate'
] as const

type ActivityAuthorKind = (typeof ACTIVITY_AUTHOR_KINDS)[number]

/** Synthetic kind for ledger movements (not an `auteur` prefix). */
export type TimelineActorKind = ActivityAuthorKind | 'database' | 'unknown'

export type ParsedActivityAuthor = {
  kind: TimelineActorKind
  /** Remainder after the prefix, or the raw string when unprefixed. */
  id: string
  /** Display label (no prefix). `agent:*` always shows `Bot`. */
  label: string
}

const KIND_SET = new Set<string>(ACTIVITY_AUTHOR_KINDS)

export function parseActivityAuthor(auteur: string | null | undefined): ParsedActivityAuthor {
  const raw = typeof auteur === 'string' ? auteur.trim() : ''
  if (!raw) {
    return { kind: 'unknown', id: '', label: '' }
  }

  const separator = raw.indexOf(':')
  if (separator > 0) {
    const prefix = raw.slice(0, separator).toLowerCase()
    const remainder = raw.slice(separator + 1).trim()
    if (KIND_SET.has(prefix) && remainder) {
      const kind = prefix as ActivityAuthorKind
      return {
        kind,
        id: remainder,
        label: kind === 'agent' ? 'Bot' : remainder
      }
    }
  }

  return { kind: 'unknown', id: raw, label: raw }
}

/** Two-letter initials from a display name / login (uppercase). */
export function authorInitials(label: string): string {
  const cleaned = label.trim()
  if (!cleaned) return '?'
  const parts = cleaned.split(/[\s._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    const first = parts[0]!.charAt(0)
    const second = parts[1]!.charAt(0)
    return `${first}${second}`.toUpperCase()
  }
  const chars = Array.from(cleaned)
  if (chars.length === 1) return chars[0]!.toUpperCase()
  return `${chars[0]}${chars[1]}`.toUpperCase()
}

export function databaseTimelineActor(): ParsedActivityAuthor {
  return { kind: 'database', id: 'database', label: 'Base de données' }
}
