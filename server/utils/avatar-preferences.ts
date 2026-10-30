import {
  isReservedDisplayName,
  normalizeDisplayName,
  normalizePreferredName,
  type UserPreferences
} from '../../shared/user-preferences'
import { login_from_email } from './activities/rows'
import { get_user_preferences, patch_user_preferences } from './automations/store'
import { openDatastore } from './datastore-db'
import { name } from './setup-store'
import { parseStoredUserPreferences, storedUserPreferences } from './user-preferences-stored'

function default_display_name(email: string): string {
  return login_from_email(email)
}

function display_name_from_prefs(email: string, prefs: UserPreferences): string {
  if (prefs.displayName) return prefs.displayName
  return default_display_name(email)
}

/** Resolved display name (custom or email local-part). */
export function resolve_display_name(email: string): string {
  return display_name_from_prefs(email, get_user_preferences(email))
}

/**
 * Persist custom display name.
 * null / empty / equal to email local-part → clear (use default).
 */
export function set_display_name(email: string, raw: string | null): string {
  const fallback = default_display_name(email)
  let next = raw === null || raw === '' ? null : normalizeDisplayName(raw)
  if (next && next.toLowerCase() === fallback.toLowerCase()) next = null
  patch_user_preferences(email, { displayName: next })
  return next ?? fallback
}

export type MePreferencesPatch = {
  hasAvatar: boolean
  displayName: string
  preferredName: string | null
}

/** Apply a partial preferences patch for the current user. */
export function patch_me_preferences(
  email: string,
  body: {
    avatar?: unknown
    display_name?: unknown
    preferred_name?: unknown
  }
): MePreferencesPatch | { error: string } {
  const hasAvatar = 'avatar' in body
  const hasDisplayName = 'display_name' in body
  const hasPreferredName = 'preferred_name' in body
  if (!hasAvatar && !hasDisplayName && !hasPreferredName) {
    return { error: 'avatar, displayName or preferredName required' }
  }

  if (hasDisplayName) {
    if (body.display_name !== null && typeof body.display_name !== 'string') {
      return { error: 'displayName must be a string or null' }
    }
    const normalized = normalizeDisplayName(body.display_name)
    const fallback = default_display_name(email)
    const isCustom = normalized !== null && normalized.toLowerCase() !== fallback.toLowerCase()
    if (isCustom && isReservedDisplayName(normalized, name())) {
      return { error: 'displayName is reserved for the AI' }
    }
  }

  if (hasPreferredName && body.preferred_name !== null && typeof body.preferred_name !== 'string') {
    return { error: 'preferredName must be a string or null' }
  }

  if (hasAvatar && body.avatar !== null) {
    return { error: 'avatar must be null (use POST /me/avatar to upload)' }
  }

  const db = openDatastore()
  try {
    return db
      .transaction(() => {
        const row = db
          .query<{ preferences: string | null; hasAvatar: number }, [string]>(
            `SELECT preferences, avatar IS NOT NULL AS hasAvatar
           FROM users WHERE lower(email) = ? LIMIT 1`
          )
          .get(email.toLowerCase().trim())
        if (!row) return { error: 'user not found' }
        const prefs = parseStoredUserPreferences(row.preferences)
        const fallback = default_display_name(email)
        const normalized =
          hasDisplayName && body.display_name !== null
            ? normalizeDisplayName(body.display_name as string)
            : null
        const display_name =
          normalized?.toLowerCase() === fallback.toLowerCase() ? null : normalized
        const preferred_name = hasPreferredName
          ? normalizePreferredName(body.preferred_name)
          : prefs.preferredName
        const nextPrefs = {
          ...prefs,
          ...(hasDisplayName ? { displayName: display_name } : {}),
          ...(hasPreferredName ? { preferredName: preferred_name } : {})
        }
        db.run(
          `UPDATE users
         SET preferences = ?,
             avatar = CASE WHEN ? THEN NULL ELSE avatar END,
             avatar_version = avatar_version + CASE WHEN ? THEN 1 ELSE 0 END
         WHERE lower(email) = ?`,
          [
            JSON.stringify(storedUserPreferences(nextPrefs)),
            hasAvatar ? 1 : 0,
            hasAvatar ? 1 : 0,
            email.toLowerCase().trim()
          ]
        )
        return {
          hasAvatar: hasAvatar ? false : row.hasAvatar === 1,
          displayName: nextPrefs.displayName ?? fallback,
          preferredName: nextPrefs.preferredName
        }
      })
      .immediate()
  } finally {
    db.close()
  }
}
