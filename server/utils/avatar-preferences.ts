import { Database } from 'bun:sqlite'

import desktop_config from '../../customization/desktop'
import {
  isReservedDisplayName,
  normalizeDisplayName,
  parseUserPreferences,
  type UserPreferences
} from '../../shared/automations'
import { login_from_email } from './activities/rows'
import { get_user_preferences, patch_user_preferences } from './automations/store'
import { datastorePaths } from './paths'

function default_display_name(email: string): string {
  return login_from_email(email)
}

function display_name_from_prefs(email: string, prefs: UserPreferences): string {
  if (prefs.display_name) return prefs.display_name
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
  patch_user_preferences(email, { display_name: next })
  return next ?? fallback
}

export type MePreferencesPatch = {
  hasAvatar: boolean
  displayName: string
}

/** Apply a partial preferences patch for the current user. */
export function patch_me_preferences(
  email: string,
  body: {
    avatar?: unknown
    display_name?: unknown
  }
): MePreferencesPatch | { error: string } {
  const hasAvatar = 'avatar' in body
  const hasDisplayName = 'display_name' in body
  if (!hasAvatar && !hasDisplayName) {
    return { error: 'avatar or display_name required' }
  }

  if (hasDisplayName) {
    if (body.display_name !== null && typeof body.display_name !== 'string') {
      return { error: 'display_name must be a string or null' }
    }
    const normalized = normalizeDisplayName(body.display_name)
    const fallback = default_display_name(email)
    const isCustom = normalized !== null && normalized.toLowerCase() !== fallback.toLowerCase()
    if (isCustom && isReservedDisplayName(normalized, desktop_config.name)) {
      return { error: 'display_name is reserved for the AI' }
    }
  }

  if (hasAvatar && body.avatar !== null) {
    return { error: 'avatar must be null (use POST /desktop/me/avatar to upload)' }
  }

  const db = new Database(datastorePaths().database)
  db.run('PRAGMA busy_timeout = 5000')
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
        const prefs = parseUserPreferences(row.preferences)
        const fallback = default_display_name(email)
        const normalized =
          hasDisplayName && body.display_name !== null
            ? normalizeDisplayName(body.display_name as string)
            : null
        const display_name =
          normalized?.toLowerCase() === fallback.toLowerCase() ? null : normalized
        const nextPrefs = hasDisplayName ? { ...prefs, display_name } : prefs
        db.run(
          `UPDATE users
         SET preferences = ?,
             avatar = CASE WHEN ? THEN NULL ELSE avatar END,
             avatar_version = avatar_version + CASE WHEN ? THEN 1 ELSE 0 END
         WHERE lower(email) = ?`,
          [
            JSON.stringify(nextPrefs),
            hasAvatar ? 1 : 0,
            hasAvatar ? 1 : 0,
            email.toLowerCase().trim()
          ]
        )
        return {
          hasAvatar: hasAvatar ? false : row.hasAvatar === 1,
          displayName: nextPrefs.display_name ?? fallback
        }
      })
      .immediate()
  } finally {
    db.close()
  }
}
