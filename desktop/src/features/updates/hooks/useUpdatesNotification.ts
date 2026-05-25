import { useCallback, useEffect, useState } from 'react'

import { fetchUpdatesIndex } from '@/features/updates/lib/github-updates'
import {
  countUnread,
  markScopeRead,
  resolveUpdatesReadSlugs
} from '@/features/updates/lib/updates-notification'
import type { UpdateEntry } from '@/features/updates/types'
import {
  resolveUpdatesNotifyScope,
  type Settings,
  type UpdatesNotifyScope
} from '@/shared/types/settings'

interface UseUpdatesNotificationOptions {
  settings: Settings
  onSettingsChange: (settings: Settings) => void
}

interface UseUpdatesNotificationResult {
  entries: UpdateEntry[]
  unreadCount: number
  notifyScope: UpdatesNotifyScope
  markSeen: () => Promise<void>
  refresh: () => Promise<void>
}

export function useUpdatesNotification({
  settings,
  onSettingsChange
}: UseUpdatesNotificationOptions): UseUpdatesNotificationResult {
  const [entries, setEntries] = useState<UpdateEntry[]>([])
  const notifyScope = resolveUpdatesNotifyScope(settings)
  const readSlugs = resolveUpdatesReadSlugs(
    entries,
    settings.updatesReadSlugs,
    settings.updatesLastSeenSlug
  )

  const refresh = useCallback(async () => {
    try {
      const nextEntries = await fetchUpdatesIndex({ force: true })
      setEntries(nextEntries)
    } catch {
      setEntries([])
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    function handleFocus() {
      void refresh()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refresh])

  const markSeen = useCallback(async () => {
    const nextReadSlugs = markScopeRead(entries, notifyScope, settings.updatesReadSlugs)
    if (nextReadSlugs.length === (settings.updatesReadSlugs?.length ?? 0)) return

    const { updatesLastSeenSlug: _legacy, ...rest } = settings
    const nextSettings = { ...rest, updatesReadSlugs: nextReadSlugs }
    onSettingsChange(nextSettings)
    if (window.api?.saveSettings) {
      await window.api.saveSettings(nextSettings)
    }
  }, [entries, notifyScope, onSettingsChange, settings])

  const unreadCount = countUnread(entries, notifyScope, readSlugs)

  return {
    entries,
    unreadCount,
    notifyScope,
    markSeen,
    refresh
  }
}
