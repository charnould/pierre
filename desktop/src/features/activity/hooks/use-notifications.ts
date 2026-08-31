import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { ActivityBoostEmoji } from '@/features/activity/lib/activity-boosts'
import {
  contextLabelForNotification,
  moduleLabelForType
} from '@/features/activity/lib/notification-labels'
import {
  mapActivityRow,
  type ActivityNotificationItem
} from '@/features/activity/lib/notification-types'
import { toast } from '@/shared/components/ui/toast'
import type {
  ActiviteListItem,
  CreateActivityBody,
  Mention,
  ActivityContext
} from '@/shared/types/activites'
import { mention_of } from '@/shared/types/activites'

import {
  ACTIVITY_PAGE_SIZE,
  appendUniqueActivityRows,
  pageIsFull,
  refreshWindowLimit
} from './activity-page'

/**
 * Component-local state, despite looking like a shared store: calling this twice
 * gives you two independent copies of the same server data, two fetches, and two
 * `refresh` functions that cannot see each other's writes. Call it once and
 * thread the result. The app-wide instance lives in `useActivityFeed` and is
 * reachable as `feed.notifications`.
 */
export function useNotifications(
  url: string | undefined,
  userLogin: string,
  enabled = true,
  unreadOnly = false
) {
  const [rows, setRows] = useState<ActiviteListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const rowsRef = useRef(rows)
  const hasMoreRef = useRef(hasMore)
  useEffect(() => {
    rowsRef.current = rows
    hasMoreRef.current = hasMore
  })
  const requestGeneration = useRef(0)
  const loadingMoreRef = useRef(false)
  const unreadOnlyRef = useRef(unreadOnly)

  const refresh = useCallback(async () => {
    if (!enabled || !url || !window.api?.getActivities) {
      setRows([])
      setHasMore(false)
      return
    }
    const filterChanged = unreadOnlyRef.current !== unreadOnly
    unreadOnlyRef.current = unreadOnly
    if (filterChanged) {
      rowsRef.current = []
      setRows([])
      setHasMore(false)
    }
    const generation = ++requestGeneration.current
    const initial = rowsRef.current.length === 0
    const limit = refreshWindowLimit(rowsRef.current.length)
    if (initial) setLoading(true)
    try {
      const res = await window.api.getActivities({
        url,
        inbox: true,
        unread_only: unreadOnly,
        limit,
        offset: 0
      })
      if (!res || generation !== requestGeneration.current) return
      setRows(res.data)
      setHasMore(pageIsFull(res.data.length, limit))
    } finally {
      if (initial && generation === requestGeneration.current) setLoading(false)
    }
  }, [enabled, unreadOnly, url])

  const loadMore = useCallback(async () => {
    if (
      !enabled ||
      !url ||
      !window.api?.getActivities ||
      !hasMoreRef.current ||
      loadingMoreRef.current
    ) {
      return
    }
    const generation = requestGeneration.current
    const offset = rowsRef.current.length
    loadingMoreRef.current = true
    try {
      const res = await window.api.getActivities({
        url,
        inbox: true,
        unread_only: unreadOnly,
        limit: ACTIVITY_PAGE_SIZE,
        offset
      })
      if (!res || generation !== requestGeneration.current) return
      setRows((prev) => appendUniqueActivityRows(prev, res.data))
      setHasMore(pageIsFull(res.data.length, ACTIVITY_PAGE_SIZE))
    } finally {
      loadingMoreRef.current = false
    }
  }, [enabled, unreadOnly, url])

  useEffect(() => {
    if (!enabled || !url || !window.api?.getActivities) return
    const generation = ++requestGeneration.current
    const limit = refreshWindowLimit(rowsRef.current.length)
    void window.api
      .getActivities({
        url,
        inbox: true,
        unread_only: unreadOnly,
        limit,
        offset: 0
      })
      .then((res) => {
        if (!res || generation !== requestGeneration.current) return
        setRows(res.data)
        setHasMore(pageIsFull(res.data.length, limit))
        setLoading(false)
      })
    return () => {
      requestGeneration.current += 1
    }
  }, [enabled, unreadOnly, url])

  const replaceRows = useCallback((nextRows: ActiviteListItem[], limit: number) => {
    rowsRef.current = nextRows
    setRows(nextRows)
    setHasMore(pageIsFull(nextRows.length, limit))
  }, [])

  const items = useMemo((): ActivityNotificationItem[] => {
    return rows.map((row) =>
      mapActivityRow(
        row,
        contextLabelForNotification(
          row.rattachement.slice(0, row.rattachement.indexOf(':')) as ActivityContext,
          row.rattachement.slice(row.rattachement.indexOf(':') + 1)
        ),
        moduleLabelForType(
          row.rattachement.slice(0, row.rattachement.indexOf(':')) as ActivityContext
        )
      )
    )
  }, [rows])

  const createActivity = useCallback(
    async (body: CreateActivityBody) => {
      if (!url || !window.api?.createActivity) return null
      const res = await window.api.createActivity({ url, ...body })
      if (!res) {
        toast.add({ title: 'Activité non enregistrée', type: 'error' })
        return null
      }
      await refresh()
      return res
    },
    [refresh, url]
  )

  const destinataire = userLogin.includes(':') ? userLogin : `user:${userLogin}`

  const patchMention = useCallback(
    async (
      row: ActiviteListItem,
      patch: Partial<Pick<Mention, 'lu' | 'boost'>>,
      options?: { refresh?: boolean }
    ) => {
      if (!url || !window.api?.patchActivity || !mention_of(row.mentions, destinataire)) return null
      const res = await window.api.patchActivity({
        url,
        id: row.id,
        patch: { operation: 'set_mention', ...patch }
      })
      if (res && options?.refresh !== false) await refresh()
      return res
    },
    [destinataire, refresh, url]
  )

  const markRead = useCallback(
    async (id: number) => {
      const row = rows.find((entry) => entry.id === id)
      if (!row) return null
      return patchMention(row, { lu: true })
    },
    [patchMention, rows]
  )

  const markUnread = useCallback(
    async (id: number) => {
      const row = rows.find((entry) => entry.id === id)
      if (!row) return null
      return patchMention(row, { lu: false })
    },
    [patchMention, rows]
  )

  const markAllRead = useCallback(async () => {
    const unread = rows.filter((row) => row.my?.lu === false)
    await Promise.all(unread.map((row) => patchMention(row, { lu: true }, { refresh: false })))
    await refresh()
  }, [patchMention, refresh, rows])

  const toggleBoost = useCallback(
    async (id: number, emoji: ActivityBoostEmoji) => {
      if (!url || !window.api?.patchActivity) return null
      const row = rows.find((entry) => entry.id === id)
      const current = mention_of(row?.mentions ?? [], destinataire)?.boost ?? null
      const nextEmoji = current === emoji ? null : emoji
      const res = await window.api.patchActivity({
        url,
        id,
        patch: { operation: 'set_boost', emoji: nextEmoji }
      })
      if (res) await refresh()
      return res
    },
    [destinataire, refresh, rows, url]
  )

  const getBoost = useCallback(
    (id: number): ActivityBoostEmoji | undefined => {
      const row = rows.find((entry) => entry.id === id)
      if (!row) return undefined
      const emoji = mention_of(row.mentions, destinataire)?.boost ?? undefined
      return emoji as ActivityBoostEmoji | undefined
    },
    [destinataire, rows]
  )

  const hasUnreadFor = useCallback(
    (type: ActivityContext, ref: string) =>
      rows.some((row) => row.rattachement === `${type}:${ref}` && row.my?.lu === false),
    [rows]
  )

  const markAllReadForRef = useCallback(
    async (type: ActivityContext, ref: string) => {
      const unread = rows.filter(
        (row) => row.rattachement === `${type}:${ref}` && row.my?.lu === false
      )
      await Promise.all(unread.map((row) => patchMention(row, { lu: true }, { refresh: false })))
      await refresh()
    },
    [patchMention, refresh, rows]
  )

  const unreadCount = useMemo(() => rows.filter((row) => row.my?.lu === false).length, [rows])

  return useMemo(
    () => ({
      items,
      rows,
      replaceRows,
      loading,
      unreadCount,
      hasMore,
      refresh,
      loadMore,
      createActivity,
      markRead,
      markUnread,
      markAllRead,
      toggleBoost,
      getBoost,
      hasUnreadFor,
      markAllReadForRef
    }),
    [
      items,
      rows,
      replaceRows,
      loading,
      unreadCount,
      hasMore,
      refresh,
      loadMore,
      createActivity,
      markRead,
      markUnread,
      markAllRead,
      toggleBoost,
      getBoost,
      hasUnreadFor,
      markAllReadForRef
    ]
  )
}

export type NotificationsApi = ReturnType<typeof useNotifications>
