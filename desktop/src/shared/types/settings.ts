export type UpdatesNotifyScope = 'off' | 'all'

export const DEFAULT_UPDATES_NOTIFY_SCOPE: UpdatesNotifyScope = 'all'

export interface Settings {
  url?: string
  email?: string
  password?: string
  /** Present on renderer reads: a password exists in the main-process store. */
  hasPassword?: boolean
  loggedOut?: boolean
  updatesNotify?: UpdatesNotifyScope
  /** Slugs of individually read update articles. */
  updatesReadSlugs?: string[]
  /** Include activities authored by the signed-in user in the activity center. */
  showOwnActivity?: boolean
  /** Canonical `user:email` authors followed in the activity center. */
  followedActivityAuthors?: string[]
}

/** Changelog notifications are always on: they cannot be turned off. */
export function resolveUpdatesNotifyScope(_settings: Settings): UpdatesNotifyScope {
  return DEFAULT_UPDATES_NOTIFY_SCOPE
}
