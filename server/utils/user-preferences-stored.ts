import { z } from 'zod'

import {
  normalizeDisplayName,
  normalizePreferredName,
  type UserPreferences
} from '../../shared/user-preferences'

const StoredUserPreferencesSchema = z
  .object({
    pinned_automation_ids: z.array(z.string()).default([]),
    display_name: z.string().nullable().default(null),
    preferred_name: z.string().nullable().default(null)
  })
  .strict()

export const parseStoredUserPreferences = (raw: unknown): UserPreferences => {
  if (raw == null || raw === '') {
    return { pinnedAutomationIds: [], displayName: null, preferredName: null }
  }
  const stored = StoredUserPreferencesSchema.parse(typeof raw === 'string' ? JSON.parse(raw) : raw)
  return {
    pinnedAutomationIds: stored.pinned_automation_ids,
    displayName: normalizeDisplayName(stored.display_name),
    preferredName: normalizePreferredName(stored.preferred_name)
  }
}

export const storedUserPreferences = (preferences: UserPreferences) =>
  StoredUserPreferencesSchema.parse({
    pinned_automation_ids: preferences.pinnedAutomationIds,
    display_name: preferences.displayName,
    preferred_name: preferences.preferredName
  })
