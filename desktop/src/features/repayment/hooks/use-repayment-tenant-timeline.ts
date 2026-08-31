import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Activite } from '@/shared/types/activites'
import type { LedgerMovementRow } from '@/shared/types/ledger'

import { buildRepaymentTimeline, type RepaymentTimelineItem } from '../lib/build-repayment-timeline'
import {
  resolveTenantDebtEpisode,
  type TenantBalancePoint
} from '../lib/build-tenant-balance-series'
import {
  getRepaymentTimelineCache,
  patchRepaymentTimelineActivity,
  prefetchRepaymentTimeline,
  repaymentTimelineCacheKey
} from '../lib/repayment-timeline-cache'

/** Stable identities, so the timeline memo does not recompute on every render. */
const NO_MOVEMENTS: LedgerMovementRow[] = []
const NO_NOTIFICATIONS: Activite[] = []

export type TimelineRefreshResult = {
  ok: boolean
  movementsError: boolean
  notificationsError: boolean
  openActionsError: boolean
}

const IDLE_REFRESH: TimelineRefreshResult = {
  ok: true,
  movementsError: false,
  notificationsError: false,
  openActionsError: false
}

type TimelineState = {
  key: string | null
  movements: LedgerMovementRow[]
  notifications: Activite[]
  openActionEvents: Activite[]
  movementsError: boolean
  notificationsError: boolean
  openActionsError: boolean
  status: 'idle' | 'loading' | 'refreshing' | 'ready'
}

function replaceActivityById(rows: Activite[], activity: Activite): Activite[] {
  let found = false
  const next = rows.map((row) => {
    if (row.id !== activity.id) return row
    found = true
    return activity
  })
  return found ? next : rows
}

function hasDisplayedData(current: TimelineState): boolean {
  return (
    current.status === 'ready' ||
    current.status === 'refreshing' ||
    current.notifications.length > 0 ||
    current.movements.length > 0 ||
    current.openActionEvents.length > 0
  )
}

function readInitialState(requestKey: string | null): TimelineState {
  if (!requestKey) {
    return {
      key: null,
      movements: [],
      notifications: [],
      openActionEvents: [],
      movementsError: false,
      notificationsError: false,
      openActionsError: false,
      status: 'idle'
    }
  }

  const cached = getRepaymentTimelineCache(requestKey)
  if (!cached) {
    return {
      key: requestKey,
      movements: [],
      notifications: [],
      openActionEvents: [],
      movementsError: false,
      notificationsError: false,
      openActionsError: false,
      status: 'loading'
    }
  }

  return {
    key: requestKey,
    movements: cached.movements,
    notifications: cached.notifications,
    openActionEvents: cached.openActionEvents,
    movementsError: cached.movementsError,
    notificationsError: cached.notificationsError,
    openActionsError: cached.openActionsError,
    status: 'ready'
  }
}

export function useRepaymentTenantTimeline(
  url: string | undefined,
  id_client: string | undefined,
  id_locataire: string | undefined,
  enabled = true,
  currentBalance?: number
) {
  const requestKey = useMemo(
    () => (enabled && url ? repaymentTimelineCacheKey(url, id_client, id_locataire) : null),
    [enabled, id_client, id_locataire, url]
  )
  const [state, setState] = useState<TimelineState>(() => readInitialState(requestKey))
  const requestIdRef = useRef(0)
  const requestKeyRef = useRef(requestKey)
  useEffect(() => {
    requestKeyRef.current = requestKey
  })

  const refresh = useCallback(
    async (options?: { force?: boolean }): Promise<TimelineRefreshResult> => {
      const requestId = ++requestIdRef.current

      if (!requestKey || !url) {
        return IDLE_REFRESH
      }

      const cached = getRepaymentTimelineCache(requestKey)
      setState((current) => {
        if (current.key === requestKey && hasDisplayedData(current)) {
          return { ...current, status: 'refreshing' }
        }
        if (cached) {
          return {
            key: requestKey,
            movements: cached.movements,
            notifications: cached.notifications,
            openActionEvents: cached.openActionEvents,
            movementsError: cached.movementsError,
            notificationsError: cached.notificationsError,
            openActionsError: cached.openActionsError,
            status: 'refreshing'
          }
        }
        return {
          key: requestKey,
          movements: [],
          notifications: [],
          openActionEvents: [],
          movementsError: false,
          notificationsError: false,
          openActionsError: false,
          status: 'loading'
        }
      })

      const entry = await prefetchRepaymentTimeline({
        url,
        id_client,
        id_locataire,
        force: options?.force
      })
      if (requestId !== requestIdRef.current || requestKey !== requestKeyRef.current) {
        return IDLE_REFRESH
      }

      setState({
        key: requestKey,
        movements: entry.movements,
        notifications: entry.notifications,
        openActionEvents: entry.openActionEvents,
        movementsError: entry.movementsError,
        notificationsError: entry.notificationsError,
        openActionsError: entry.openActionsError,
        status: 'ready'
      })
      return {
        ok: !entry.movementsError && !entry.notificationsError && !entry.openActionsError,
        movementsError: entry.movementsError,
        notificationsError: entry.notificationsError,
        openActionsError: entry.openActionsError
      }
    },
    [id_client, id_locataire, requestKey, url]
  )

  const applyActivityPatch = useCallback(
    (activity: Activite) => {
      requestIdRef.current += 1
      if (requestKey) patchRepaymentTimelineActivity(requestKey, activity)
      setState((current) => {
        if (current.key !== requestKey) return current
        return {
          ...current,
          notifications: replaceActivityById(current.notifications, activity),
          openActionEvents: replaceActivityById(current.openActionEvents, activity),
          status: 'ready'
        }
      })
    },
    [requestKey]
  )

  if (state.key !== requestKey) {
    setState(readInitialState(requestKey))
  }

  useEffect(() => {
    if (!requestKey || !url) return
    const requestId = ++requestIdRef.current
    const capturedKey = requestKey
    void prefetchRepaymentTimeline({
      url,
      id_client,
      id_locataire
    }).then((entry) => {
      if (requestId !== requestIdRef.current || capturedKey !== requestKeyRef.current) return
      setState({
        key: capturedKey,
        movements: entry.movements,
        notifications: entry.notifications,
        openActionEvents: entry.openActionEvents,
        movementsError: entry.movementsError,
        notificationsError: entry.notificationsError,
        openActionsError: entry.openActionsError,
        status: 'ready'
      })
    })
  }, [id_client, id_locataire, requestKey, url])

  const isCurrent = state.key === requestKey
  const initialLoading = requestKey != null && (!isCurrent || state.status === 'loading')
  const refreshing = isCurrent && state.status === 'refreshing'
  const movements = isCurrent ? state.movements : NO_MOVEMENTS
  const notifications = isCurrent ? state.notifications : NO_NOTIFICATIONS
  const openActionEvents = isCurrent ? state.openActionEvents : NO_NOTIFICATIONS
  const episode = useMemo(
    (): TenantBalancePoint[] | null =>
      currentBalance == null ? null : resolveTenantDebtEpisode(movements, currentBalance),
    [currentBalance, movements]
  )
  const entries = useMemo(
    () =>
      buildRepaymentTimeline(movements, notifications, {
        currentBalance,
        ...(currentBalance == null ? {} : { episode })
      }),
    [currentBalance, episode, movements, notifications]
  )

  return {
    entries,
    notifications,
    openActionEvents,
    movements,
    episode,
    loading: initialLoading || refreshing,
    initialLoading,
    refreshing,
    loadingMovements: initialLoading,
    movementsError: isCurrent ? state.movementsError : false,
    notificationsError: isCurrent ? state.notificationsError : false,
    openActionsError: isCurrent ? state.openActionsError : false,
    refresh,
    applyActivityPatch
  } satisfies {
    entries: RepaymentTimelineItem[]
    notifications: Activite[]
    openActionEvents: Activite[]
    movements: LedgerMovementRow[]
    episode: TenantBalancePoint[] | null
    loading: boolean
    initialLoading: boolean
    refreshing: boolean
    loadingMovements: boolean
    movementsError: boolean
    notificationsError: boolean
    openActionsError: boolean
    refresh: (options?: { force?: boolean }) => Promise<TimelineRefreshResult>
    applyActivityPatch: (activity: Activite) => void
  }
}
