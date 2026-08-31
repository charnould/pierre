import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuthoredActivity } from '@/features/activity/hooks/use-authored-activity'
import { useNotifications } from '@/features/activity/hooks/use-notifications'
import { useUpdatesNotification } from '@/features/updates/hooks/useUpdatesNotification'
import {
  isUpdateFeedItemId,
  mapUpdateEntryToFeedItem,
  mergeActivityFeedItems,
  slugFromUpdateFeedItemId
} from '@/features/updates/lib/map-update-feed-item'
import {
  filterEntriesByScope,
  markEntryRead,
  markEntryUnread,
  markScopeRead,
  resolveUpdatesReadSlugs
} from '@/features/updates/lib/updates-notification'
import type { Settings } from '@/shared/types/settings'

import { refreshWindowLimit } from './activity-page'

const ACTIVITY_VISIBLE_POLL_MS = 30_000
const ACTIVITY_HIDDEN_POLL_MS = 120_000

interface UseActivityFeedOptions {
  settings: Settings
  onSettingsChange: (settings: Settings) => void
  userLogin: string
  isLoggedIn: boolean
}

export function useActivityFeed({
  settings,
  onSettingsChange,
  userLogin,
  isLoggedIn
}: UseActivityFeedOptions) {
  const [showRead, setShowRead] = useState(false)
  const notifications = useNotifications(settings.url, userLogin, isLoggedIn, !showRead)
  const ownAuthor = userLogin ? `user:${userLogin}` : ''
  const followedAuthors = useMemo(
    () => settings.followedActivityAuthors ?? [],
    [settings.followedActivityAuthors]
  )
  const activityAuthors = useMemo(
    () => [
      ...(settings.showOwnActivity && ownAuthor ? [ownAuthor] : []),
      ...followedAuthors.filter((author) => author !== ownAuthor)
    ],
    [followedAuthors, ownAuthor, settings.showOwnActivity]
  )
  const authoredActivity = useAuthoredActivity(settings.url, activityAuthors, isLoggedIn)
  const updates = useUpdatesNotification({ settings, onSettingsChange })
  const notificationRowsLength = notifications.rows.length
  const replaceNotificationRows = notifications.replaceRows
  const authoredRowsLength = authoredActivity.rows.length
  const replaceAuthoredRows = authoredActivity.replaceRows
  const feedEtag = useRef('')
  const syncInFlight = useRef(false)
  const authorsKey = activityAuthors.join('\n')

  useEffect(() => {
    feedEtag.current = ''
  }, [authorsKey, settings.url, showRead, userLogin])

  useEffect(() => {
    if (!isLoggedIn || !settings.url || !window.api?.syncActivityFeed) return
    let disposed = false
    let timer: number | undefined

    const schedule = () => {
      if (disposed) return
      const delay = document.hidden ? ACTIVITY_HIDDEN_POLL_MS : ACTIVITY_VISIBLE_POLL_MS
      timer = window.setTimeout(() => void poll(), delay)
    }
    const poll = async () => {
      if (disposed || syncInFlight.current) return
      syncInFlight.current = true
      const inboxLimit = refreshWindowLimit(notificationRowsLength)
      const authoredLimit = refreshWindowLimit(authoredRowsLength)
      try {
        const result = await window.api.syncActivityFeed({
          url: settings.url!,
          auteurs: activityAuthors,
          unread_only: !showRead,
          inbox_limit: inboxLimit,
          authored_limit: authoredLimit,
          etag: feedEtag.current || undefined
        })
        if (disposed || !result) return
        feedEtag.current = result.etag
        if (!result.notModified) {
          replaceNotificationRows(result.data.notifications, inboxLimit)
          replaceAuthoredRows(result.data.authored, authoredLimit)
        }
      } finally {
        syncInFlight.current = false
        schedule()
      }
    }
    const wake = () => {
      if (timer !== undefined) window.clearTimeout(timer)
      void poll()
    }
    const visibilityChanged = () => {
      if (!document.hidden) {
        wake()
        return
      }
      if (timer !== undefined) window.clearTimeout(timer)
      schedule()
    }

    schedule()
    document.addEventListener('visibilitychange', visibilityChanged)
    window.addEventListener('focus', wake)
    window.addEventListener('online', wake)
    return () => {
      disposed = true
      if (timer !== undefined) window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', visibilityChanged)
      window.removeEventListener('focus', wake)
      window.removeEventListener('online', wake)
    }
  }, [
    activityAuthors,
    authoredRowsLength,
    isLoggedIn,
    notificationRowsLength,
    replaceAuthoredRows,
    replaceNotificationRows,
    settings.url,
    showRead
  ])

  const readSlugs = useMemo(
    () => resolveUpdatesReadSlugs(settings.updatesReadSlugs),
    [settings.updatesReadSlugs]
  )

  const updateItems = useMemo(
    () =>
      filterEntriesByScope(updates.entries, updates.notifyScope).map((entry) =>
        mapUpdateEntryToFeedItem(entry, readSlugs)
      ),
    [updates.entries, updates.notifyScope, readSlugs]
  )

  const items = useMemo(() => {
    const visibleUpdates = showRead ? updateItems : updateItems.filter((item) => !item.isRead)
    return mergeActivityFeedItems(
      [...notifications.items, ...authoredActivity.items],
      visibleUpdates
    )
  }, [authoredActivity.items, notifications.items, showRead, updateItems])

  const unreadCount = useMemo(() => {
    const mentionUnread = notifications.unreadCount
    const updateUnread = updates.unreadCount
    return mentionUnread + updateUnread
  }, [notifications.unreadCount, updates.unreadCount])

  const markItemRead = useCallback(
    async (id: string | number) => {
      if (typeof id === 'string' && isUpdateFeedItemId(id)) {
        const slug = slugFromUpdateFeedItemId(id)
        const nextReadSlugs = markEntryRead(settings.updatesReadSlugs, slug)
        if (nextReadSlugs === settings.updatesReadSlugs) return
        const nextSettings = { ...settings, updatesReadSlugs: nextReadSlugs }
        onSettingsChange(nextSettings)
        await window.api?.saveSettings(nextSettings)
        return
      }
      await notifications.markRead(typeof id === 'number' ? id : Number(id))
    },
    [notifications, onSettingsChange, settings]
  )

  const markUnread = useCallback(
    async (id: string | number) => {
      if (typeof id === 'string' && isUpdateFeedItemId(id)) {
        const slug = slugFromUpdateFeedItemId(id)
        if (!settings.updatesReadSlugs?.includes(slug)) return
        const nextReadSlugs = markEntryUnread(settings.updatesReadSlugs, slug)
        const nextSettings = { ...settings, updatesReadSlugs: nextReadSlugs }
        onSettingsChange(nextSettings)
        await window.api?.saveSettings(nextSettings)
        return
      }
      await notifications.markUnread(typeof id === 'number' ? id : Number(id))
    },
    [notifications, onSettingsChange, settings]
  )

  const markAllRead = useCallback(async () => {
    const nextReadSlugs = markScopeRead(
      updates.entries,
      updates.notifyScope,
      settings.updatesReadSlugs
    )
    if (nextReadSlugs.length !== (settings.updatesReadSlugs?.length ?? 0)) {
      const nextSettings = { ...settings, updatesReadSlugs: nextReadSlugs }
      onSettingsChange(nextSettings)
      await window.api?.saveSettings(nextSettings)
    }
    await notifications.markAllRead()
  }, [notifications, onSettingsChange, settings, updates.entries, updates.notifyScope])

  const updateActivityPreferences = useCallback(
    async (patch: Pick<Settings, 'showOwnActivity' | 'followedActivityAuthors'>) => {
      const nextSettings = { ...settings, ...patch }
      onSettingsChange(nextSettings)
      await window.api?.saveSettings(nextSettings)
    },
    [onSettingsChange, settings]
  )

  const setShowOwnActivity = useCallback(
    (showOwnActivity: boolean) =>
      updateActivityPreferences({
        showOwnActivity,
        followedActivityAuthors: settings.followedActivityAuthors
      }),
    [settings.followedActivityAuthors, updateActivityPreferences]
  )

  const setFollowedActivityAuthors = useCallback(
    (followedActivityAuthors: string[]) =>
      updateActivityPreferences({
        showOwnActivity: settings.showOwnActivity,
        followedActivityAuthors
      }),
    [settings.showOwnActivity, updateActivityPreferences]
  )

  return useMemo(
    () => ({
      items,
      unreadCount,
      markItemRead,
      markUnread,
      markAllRead,
      showOwnActivity: settings.showOwnActivity === true,
      followedActivityAuthors: followedAuthors,
      showRead,
      setShowRead,
      loadMoreNotifications: notifications.loadMore,
      loadMoreActivities: authoredActivity.loadMore,
      hasMoreNotifications: notifications.hasMore,
      hasMoreActivities: authoredActivity.hasMore,
      setShowOwnActivity,
      setFollowedActivityAuthors,
      toggleBoost: notifications.toggleBoost,
      getBoost: notifications.getBoost,
      createActivity: notifications.createActivity,
      rows: notifications.rows,
      refresh: notifications.refresh,
      /**
       * The mention store itself, for the views that need mention-only
       * semantics. `unreadCount` and `items` above fold in changelog updates;
       * these do not. Consuming it from here is what keeps the app on a single
       * store — see the note at the top of `use-notifications.ts`.
       */
      notifications
    }),
    [
      items,
      unreadCount,
      markItemRead,
      markUnread,
      markAllRead,
      settings.showOwnActivity,
      followedAuthors,
      showRead,
      setShowOwnActivity,
      setFollowedActivityAuthors,
      authoredActivity.loadMore,
      authoredActivity.hasMore,
      notifications
    ]
  )
}

export type ActivityFeedApi = ReturnType<typeof useActivityFeed>
