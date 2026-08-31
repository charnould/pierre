import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  contextLabelForNotification,
  moduleLabelForType
} from '@/features/activity/lib/notification-labels'
import {
  mapActivityRow,
  type ActivityNotificationItem
} from '@/features/activity/lib/notification-types'
import type { ActiviteListItem, ActivityContext } from '@/shared/types/activites'

import {
  ACTIVITY_PAGE_SIZE,
  appendUniqueActivityRows,
  pageIsFull,
  refreshWindowLimit
} from './activity-page'

function splitAttachment(rattachement: string): { context: ActivityContext; ref: string } | null {
  const separator = rattachement.indexOf(':')
  if (separator <= 0) return null
  const context = rattachement.slice(0, separator)
  const ref = rattachement.slice(separator + 1)
  if (!['tickets', 'repayment', 'automations', 'bulk'].includes(context) || !ref) return null
  return { context: context as ActivityContext, ref }
}

export function mapAuthoredActivityRows(rows: ActiviteListItem[]): ActivityNotificationItem[] {
  return rows.flatMap((row) => {
    const attachment = splitAttachment(row.rattachement)
    if (!attachment) return []
    const mapped = mapActivityRow(
      row,
      contextLabelForNotification(attachment.context, attachment.ref),
      moduleLabelForType(attachment.context)
    )
    return [
      {
        ...mapped,
        source: 'activity' as const,
        isRead: true,
        row
      }
    ]
  })
}

export function useAuthoredActivity(url: string | undefined, authors: string[], enabled = true) {
  const [rows, setRows] = useState<ActiviteListItem[]>([])
  const [hasMore, setHasMore] = useState(false)
  const authorsKey = useMemo(() => [...new Set(authors)].sort().join('\n'), [authors])
  const rowsRef = useRef(rows)
  const hasMoreRef = useRef(hasMore)
  useEffect(() => {
    rowsRef.current = rows
    hasMoreRef.current = hasMore
  })
  const requestGeneration = useRef(0)
  const loadingMoreRef = useRef(false)
  const authorsKeyRef = useRef(authorsKey)

  const refresh = useCallback(async () => {
    const auteurs = authorsKey ? authorsKey.split('\n') : []
    if (!enabled || !url || auteurs.length === 0 || !window.api?.getActivities) {
      setRows([])
      setHasMore(false)
      return
    }
    const authorsChanged = authorsKeyRef.current !== authorsKey
    authorsKeyRef.current = authorsKey
    if (authorsChanged) {
      rowsRef.current = []
      setRows([])
      setHasMore(false)
    }
    const generation = ++requestGeneration.current
    const limit = refreshWindowLimit(rowsRef.current.length)
    const response = await window.api.getActivities({
      url,
      auteurs,
      limit,
      offset: 0
    })
    if (!response || generation !== requestGeneration.current) return
    setRows(response.data)
    setHasMore(pageIsFull(response.data.length, limit))
  }, [authorsKey, enabled, url])

  const loadMore = useCallback(async () => {
    const auteurs = authorsKey ? authorsKey.split('\n') : []
    if (
      !enabled ||
      !url ||
      auteurs.length === 0 ||
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
      const response = await window.api.getActivities({
        url,
        auteurs,
        limit: ACTIVITY_PAGE_SIZE,
        offset
      })
      if (!response || generation !== requestGeneration.current) return
      setRows((previous) => appendUniqueActivityRows(previous, response.data))
      setHasMore(pageIsFull(response.data.length, ACTIVITY_PAGE_SIZE))
    } finally {
      loadingMoreRef.current = false
    }
  }, [authorsKey, enabled, url])

  useEffect(() => {
    const auteurs = authorsKey ? authorsKey.split('\n') : []
    if (!enabled || !url || auteurs.length === 0 || !window.api?.getActivities) return
    const generation = ++requestGeneration.current
    const limit = refreshWindowLimit(rowsRef.current.length)
    void window.api
      .getActivities({
        url,
        auteurs,
        limit,
        offset: 0
      })
      .then((response) => {
        if (!response || generation !== requestGeneration.current) return
        setRows(response.data)
        setHasMore(pageIsFull(response.data.length, limit))
      })
    return () => {
      requestGeneration.current += 1
    }
  }, [authorsKey, enabled, url])

  const replaceRows = useCallback((nextRows: ActiviteListItem[], limit: number) => {
    rowsRef.current = nextRows
    setRows(nextRows)
    setHasMore(pageIsFull(nextRows.length, limit))
  }, [])

  const items = useMemo(() => mapAuthoredActivityRows(rows), [rows])
  return useMemo(
    () => ({ items, rows, replaceRows, refresh, loadMore, hasMore }),
    [hasMore, items, loadMore, refresh, replaceRows, rows]
  )
}
