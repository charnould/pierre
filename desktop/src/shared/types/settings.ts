export type UpdatesNotifyScope = 'off' | 'product' | 'all'

export const DEFAULT_UPDATES_NOTIFY_SCOPE: UpdatesNotifyScope = 'product'

export interface Settings {
  url?: string
  email?: string
  password?: string
  loggedOut?: boolean
  updatesNotify?: UpdatesNotifyScope
  /** Slugs of individually read update articles. */
  updatesReadSlugs?: string[]
  /** @deprecated Migrated to `updatesReadSlugs` on read. */
  updatesLastSeenSlug?: string
}

export function resolveUpdatesNotifyScope(settings: Settings): UpdatesNotifyScope {
  const scope = settings.updatesNotify
  if (scope === 'off' || scope === 'product' || scope === 'all') return scope
  return DEFAULT_UPDATES_NOTIFY_SCOPE
}

export function isFactoryUpdatesNotifySettings(settings: Settings): boolean {
  return (
    resolveUpdatesNotifyScope(settings) === DEFAULT_UPDATES_NOTIFY_SCOPE &&
    !settings.updatesReadSlugs?.length &&
    !settings.updatesLastSeenSlug
  )
}
