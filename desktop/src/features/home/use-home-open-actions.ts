import { useCallback, useEffect, useRef, useState } from 'react'

import { pageIsFull } from '@/features/activity/hooks/activity-page'
import { parseActionActivity, type ActionActivity } from '@/shared/lib/activities/action-activity'
import { createRequestSequencer } from '@/shared/lib/request-sequencer'
import type { ActiviteListItem, GetActivitiesParams } from '@/shared/types/activites'

export const HOME_ACTIONS_POLL_MS = 30_000

function toOpenActions(rows: ActiviteListItem[] | undefined): ActionActivity[] {
  return (rows ?? []).flatMap((row) => {
    const parsed = parseActionActivity(row)
    return parsed?.state === 'open' ? [parsed] : []
  })
}

function appendUniqueActions(
  previous: ActionActivity[],
  incoming: ActionActivity[]
): ActionActivity[] {
  if (incoming.length === 0) return previous
  const seen = new Set(previous.map((action) => action.row.id))
  const extra = incoming.filter((action) => !seen.has(action.row.id))
  return extra.length === 0 ? previous : [...previous, ...extra]
}

function windowLimit(pageSize: number, loaded: number): number {
  return Math.max(pageSize, loaded)
}

type Lane = 'mine' | 'delegated'

export function useHomeOpenActions({
  url,
  enabled,
  mineLimit,
  delegatedLimit
}: {
  url: string | undefined
  enabled: boolean
  mineLimit: number
  delegatedLimit: number
}): {
  mine: ActionActivity[]
  delegated: ActionActivity[]
  refresh: () => Promise<void>
  loadMoreMine: () => Promise<void>
  loadMoreDelegated: () => Promise<void>
  hasMoreMine: boolean
  hasMoreDelegated: boolean
} {
  const [mine, setMine] = useState<ActionActivity[]>([])
  const [delegated, setDelegated] = useState<ActionActivity[]>([])
  const [hasMoreMine, setHasMoreMine] = useState(false)
  const [hasMoreDelegated, setHasMoreDelegated] = useState(false)
  const mineRef = useRef(mine)
  const delegatedRef = useRef(delegated)
  const hasMoreMineRef = useRef(hasMoreMine)
  const hasMoreDelegatedRef = useRef(hasMoreDelegated)
  const loadingMineRef = useRef(false)
  const loadingDelegatedRef = useRef(false)
  const sequencerRef = useRef(createRequestSequencer())
  useEffect(() => {
    mineRef.current = mine
    delegatedRef.current = delegated
    hasMoreMineRef.current = hasMoreMine
    hasMoreDelegatedRef.current = hasMoreDelegated
  })

  const fetchLane = useCallback(
    async (lane: Lane, limit: number, offset: number) => {
      if (!url || !window.api?.getActivities) return null
      const params: GetActivitiesParams =
        lane === 'mine'
          ? {
              url,
              current_threads: true,
              state: 'open',
              assignee: 'me',
              order: 'due_asc',
              limit,
              offset
            }
          : {
              url,
              current_threads: true,
              state: 'open',
              created_by: 'me',
              assignee: 'other',
              order: 'due_asc',
              limit,
              offset
            }
      return window.api.getActivities(params)
    },
    [url]
  )

  const refresh = useCallback(
    async (mode: 'first' | 'window' = 'window') => {
      if (!enabled || !url || !window.api?.getActivities) return
      const token = sequencerRef.current.begin()
      const minePage = mode === 'first' ? mineLimit : windowLimit(mineLimit, mineRef.current.length)
      const delegatedPage =
        mode === 'first' ? delegatedLimit : windowLimit(delegatedLimit, delegatedRef.current.length)
      const [mineRes, delegatedRes] = await Promise.all([
        fetchLane('mine', minePage, 0),
        fetchLane('delegated', delegatedPage, 0)
      ])
      if (!sequencerRef.current.isCurrent(token)) return
      setMine(toOpenActions(mineRes?.data))
      setDelegated(toOpenActions(delegatedRes?.data))
      setHasMoreMine(pageIsFull(mineRes?.data.length ?? 0, minePage))
      setHasMoreDelegated(pageIsFull(delegatedRes?.data.length ?? 0, delegatedPage))
    },
    [delegatedLimit, enabled, fetchLane, mineLimit, url]
  )

  const loadMoreLane = useCallback(
    async (lane: Lane) => {
      const isMine = lane === 'mine'
      const loadingRef = isMine ? loadingMineRef : loadingDelegatedRef
      const hasMore = isMine ? hasMoreMineRef.current : hasMoreDelegatedRef.current
      const loaded = isMine ? mineRef.current : delegatedRef.current
      const limit = isMine ? mineLimit : delegatedLimit
      if (!enabled || !url || !window.api?.getActivities || !hasMore || loadingRef.current) return
      loadingRef.current = true
      const token = sequencerRef.current.begin()
      try {
        const response = await fetchLane(lane, limit, loaded.length)
        if (!response || !sequencerRef.current.isCurrent(token)) return
        const incoming = toOpenActions(response.data)
        if (isMine) {
          setMine((previous) => appendUniqueActions(previous, incoming))
          setHasMoreMine(pageIsFull(response.data.length, limit))
        } else {
          setDelegated((previous) => appendUniqueActions(previous, incoming))
          setHasMoreDelegated(pageIsFull(response.data.length, limit))
        }
      } finally {
        loadingRef.current = false
      }
    },
    [delegatedLimit, enabled, fetchLane, mineLimit, url]
  )

  const loadMoreMine = useCallback(() => loadMoreLane('mine'), [loadMoreLane])
  const loadMoreDelegated = useCallback(() => loadMoreLane('delegated'), [loadMoreLane])
  const refreshWindow = useCallback(() => refresh('window'), [refresh])

  useEffect(() => {
    if (!enabled) return
    // Remote open-action lists — this effect is the sync boundary.
    // oxlint-disable-next-line react/set-state-in-effect
    void refresh('first')
    const id = window.setInterval(() => void refresh('window'), HOME_ACTIONS_POLL_MS)
    const wake = () => void refresh('window')
    window.addEventListener('focus', wake)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', wake)
    }
  }, [enabled, refresh])

  return {
    mine,
    delegated,
    refresh: refreshWindow,
    loadMoreMine,
    loadMoreDelegated,
    hasMoreMine,
    hasMoreDelegated
  }
}
