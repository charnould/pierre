import type { Activite } from '@/shared/types/activites'
import type { LedgerMovementRow } from '@/shared/types/ledger'

export type RepaymentTimelineCacheEntry = {
  movements: LedgerMovementRow[]
  notifications: Activite[]
  openActionEvents: Activite[]
  movementsError: boolean
  notificationsError: boolean
  openActionsError: boolean
}

type CacheRecord = RepaymentTimelineCacheEntry & {
  generation: number
  promise?: Promise<RepaymentTimelineCacheEntry>
}

const cache = new Map<string, CacheRecord>()
const generations = new Map<string, number>()

export function repaymentTimelineCacheKey(
  url: string,
  id_client: string | undefined,
  id_locataire: string | undefined
): string {
  return JSON.stringify([url, id_client ?? null, id_locataire ?? null])
}

export function getRepaymentTimelineCache(key: string): RepaymentTimelineCacheEntry | null {
  const entry = cache.get(key)
  if (!entry) return null
  return {
    movements: entry.movements,
    notifications: entry.notifications,
    openActionEvents: entry.openActionEvents,
    movementsError: entry.movementsError,
    notificationsError: entry.notificationsError,
    openActionsError: entry.openActionsError
  }
}

export function setRepaymentTimelineCache(key: string, entry: RepaymentTimelineCacheEntry): void {
  const generation = (generations.get(key) ?? 0) + 1
  generations.set(key, generation)
  cache.set(key, {
    ...entry,
    generation,
    promise: undefined
  })
}

export function invalidateRepaymentTimelineCache(
  url: string,
  id_client: string | undefined,
  id_locataire: string | undefined
): void {
  const key = repaymentTimelineCacheKey(url, id_client, id_locataire)
  generations.set(key, (generations.get(key) ?? 0) + 1)
  cache.delete(key)
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

/** Applies a confirmed PATCH locally and invalidates any in-flight prefetch. */
export function patchRepaymentTimelineActivity(key: string, activity: Activite): void {
  const existing = cache.get(key)
  const generation = (generations.get(key) ?? 0) + 1
  generations.set(key, generation)
  if (!existing) return
  cache.set(key, {
    ...existing,
    notifications: replaceActivityById(existing.notifications, activity),
    openActionEvents: replaceActivityById(existing.openActionEvents, activity),
    generation,
    promise: undefined
  })
}

export function prefetchRepaymentTimeline(params: {
  url: string
  id_client?: string
  id_locataire?: string
  force?: boolean
}): Promise<RepaymentTimelineCacheEntry> {
  const key = repaymentTimelineCacheKey(params.url, params.id_client, params.id_locataire)
  const existing = cache.get(key)
  if (!params.force && existing?.promise) return existing.promise

  const generation = (generations.get(key) ?? 0) + 1
  generations.set(key, generation)
  const fallback: RepaymentTimelineCacheEntry = {
    movements: existing?.movements ?? [],
    notifications: existing?.notifications ?? [],
    openActionEvents: existing?.openActionEvents ?? [],
    movementsError: existing?.movementsError ?? false,
    notificationsError: existing?.notificationsError ?? false,
    openActionsError: existing?.openActionsError ?? false
  }
  const promise = fetchRepaymentTimeline(params, fallback).then((entry) => {
    if (cache.get(key)?.generation === generation) {
      cache.set(key, { ...entry, generation, promise: undefined })
    }
    return entry
  })

  cache.set(key, {
    ...fallback,
    generation,
    promise
  })

  return promise
}

async function fetchRepaymentTimeline(
  params: {
    url: string
    id_client?: string
    id_locataire?: string
  },
  fallback: RepaymentTimelineCacheEntry
): Promise<RepaymentTimelineCacheEntry> {
  const { url, id_locataire } = params
  if (!id_locataire) {
    return {
      movements: [],
      notifications: [],
      openActionEvents: [],
      movementsError: false,
      notificationsError: false,
      openActionsError: false
    }
  }
  if (!window.api?.getRepaymentTimeline) {
    return {
      ...fallback,
      movementsError: true,
      notificationsError: true,
      openActionsError: true
    }
  }

  try {
    const response = await window.api.getRepaymentTimeline({ url, id_locataire })
    if (!response) {
      return {
        ...fallback,
        movementsError: true,
        notificationsError: true,
        openActionsError: true
      }
    }
    return {
      movements: response.errors.movements ? fallback.movements : response.data.movements,
      notifications: response.errors.notifications
        ? fallback.notifications
        : response.data.notifications,
      openActionEvents: response.errors.openActions
        ? fallback.openActionEvents
        : response.data.openActionEvents,
      movementsError: response.errors.movements,
      notificationsError: response.errors.notifications,
      openActionsError: response.errors.openActions
    }
  } catch {
    return {
      ...fallback,
      movementsError: true,
      notificationsError: true,
      openActionsError: true
    }
  }
}
