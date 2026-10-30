export type UserPreferences = {
  pinnedAutomationIds: string[]
  /** Custom display name, or null to use email local-part (login). */
  displayName: string | null
  /** Name Pierre uses when addressing the current user, or null for generic greetings. */
  preferredName: string | null
}

const DISPLAY_NAME_MAX = 80
const PREFERRED_NAME_MAX = 40

function normalizeName(raw: unknown, maxLength: number): string | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim().replace(/\s+/g, ' ')
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

export function normalizeDisplayName(raw: unknown): string | null {
  return normalizeName(raw, DISPLAY_NAME_MAX)
}

export function normalizePreferredName(raw: unknown): string | null {
  return normalizeName(raw, PREFERRED_NAME_MAX)
}

export function isReservedDisplayName(raw: unknown, reservedName: unknown): boolean {
  const displayName = normalizeDisplayName(raw)
  const reserved = normalizeDisplayName(reservedName)
  return (
    displayName !== null &&
    reserved !== null &&
    displayName.toLowerCase() === reserved.toLowerCase()
  )
}
