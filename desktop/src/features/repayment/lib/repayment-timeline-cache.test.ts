import { afterEach, describe, expect, test } from 'bun:test'

import type { Activite } from '@/shared/types/activites'

import {
  getRepaymentTimelineCache,
  invalidateRepaymentTimelineCache,
  patchRepaymentTimelineActivity,
  prefetchRepaymentTimeline,
  repaymentTimelineCacheKey,
  setRepaymentTimelineCache
} from './repayment-timeline-cache'

let didStubWindow = false
let windowBeforeStub: typeof globalThis.window | undefined

function stubWindowApi(api: Record<string, unknown>) {
  windowBeforeStub = globalThis.window
  didStubWindow = true
  globalThis.window = { api } as unknown as Window & typeof globalThis
}

afterEach(() => {
  if (!didStubWindow) return
  if (windowBeforeStub) globalThis.window = windowBeforeStub
  else delete (globalThis as { window?: Window }).window
  didStubWindow = false
  windowBeforeStub = undefined
})

function activity(id: number, contenu = String(id)): Activite {
  return {
    id,
    date_creation: '2026-06-10T14:00:00',
    rattachement: 'repayment:LOC-1',
    auteur: 'user:test@exemple.fr',
    id_client: 'CLI-1',
    id_locataire: 'LOC-1',
    id_lot: null,
    type: 'note',
    statut: 'logged',
    mentions: [],
    contenu
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function timelineResponse({
  movements = [],
  notifications = [],
  openActionEvents = [],
  movementsError = false,
  notificationsError = false,
  openActionsError = false
}: {
  movements?: Record<string, unknown>[]
  notifications?: Activite[]
  openActionEvents?: Activite[]
  movementsError?: boolean
  notificationsError?: boolean
  openActionsError?: boolean
} = {}) {
  return {
    data: { movements, notifications, openActionEvents },
    errors: {
      movements: movementsError,
      notifications: notificationsError,
      openActions: openActionsError
    }
  }
}

describe('repayment-timeline-cache', () => {
  test('stores and returns entries by key', () => {
    const key = repaymentTimelineCacheKey('https://example.test', 'CLI-1', 'LOC-1')
    setRepaymentTimelineCache(key, {
      movements: [],
      notifications: [],
      openActionEvents: [],
      movementsError: false,
      notificationsError: false,
      openActionsError: false
    })

    expect(getRepaymentTimelineCache(key)).toEqual({
      movements: [],
      notifications: [],
      openActionEvents: [],
      movementsError: false,
      notificationsError: false,
      openActionsError: false
    })
  })

  test('forced revalidation starts a new generation and ignores the stale response', async () => {
    const url = 'https://generation.test'
    invalidateRepaymentTimelineCache(url, 'CLI-1', 'LOC-1')
    const requests = [
      deferred<ReturnType<typeof timelineResponse>>(),
      deferred<ReturnType<typeof timelineResponse>>()
    ]
    let request = 0
    stubWindowApi({
      getRepaymentTimeline: async (params: { id_locataire: string }) => {
        expect(params.id_locataire).toBe('LOC-1')
        return requests[request++]!.promise
      }
    })

    const stale = prefetchRepaymentTimeline({
      url,
      id_client: 'CLI-1',
      id_locataire: 'LOC-1'
    })
    const fresh = prefetchRepaymentTimeline({
      url,
      id_client: 'CLI-1',
      id_locataire: 'LOC-1',
      force: true
    })

    expect(request).toBe(2)
    requests[1]!.resolve(
      timelineResponse({
        movements: [{ date_exigibilite: '2026-06-02' }],
        notifications: [activity(2, 'fresh')]
      })
    )
    await fresh
    requests[0]!.resolve(
      timelineResponse({
        movements: [{ date_exigibilite: '2026-06-01' }],
        notifications: [activity(1, 'stale')]
      })
    )
    await stale

    expect(
      getRepaymentTimelineCache(repaymentTimelineCacheKey(url, 'CLI-1', 'LOC-1'))
    ).toMatchObject({
      movements: [{ date_exigibilite: '2026-06-02' }],
      notifications: [activity(2, 'fresh')],
      notificationsError: false
    })
  })

  test('keeps cached notifications and reports their transient refresh failure separately', async () => {
    const url = 'https://activity-failure.test'
    const key = repaymentTimelineCacheKey(url, 'CLI-1', 'LOC-1')
    invalidateRepaymentTimelineCache(url, 'CLI-1', 'LOC-1')
    setRepaymentTimelineCache(key, {
      movements: [],
      notifications: [activity(3, 'cached')],
      openActionEvents: [],
      movementsError: false,
      notificationsError: false,
      openActionsError: false
    })
    stubWindowApi({
      getRepaymentTimeline: async () =>
        timelineResponse({
          movements: [{ date_exigibilite: '2026-06-01' }],
          notificationsError: true
        })
    })

    const entry = await prefetchRepaymentTimeline({
      url,
      id_client: 'CLI-1',
      id_locataire: 'LOC-1',
      force: true
    })

    expect(entry.notifications).toEqual([activity(3, 'cached')])
    expect(entry.notificationsError).toBe(true)
    expect(entry.movementsError).toBe(false)
  })

  test('loads movements, activities and open actions through one request', async () => {
    const url = 'https://timeline.test'
    invalidateRepaymentTimelineCache(url, 'CLI-1', 'LOC-1')
    let requests = 0
    stubWindowApi({
      getRepaymentTimeline: async () => {
        requests += 1
        return timelineResponse({
          movements: [{ date_exigibilite: '2026-06-01' }],
          notifications: [activity(1)],
          openActionEvents: [activity(2, 'todo')]
        })
      }
    })

    const entry = await prefetchRepaymentTimeline({
      url,
      id_client: 'CLI-1',
      id_locataire: 'LOC-1',
      force: true
    })

    expect(requests).toBe(1)
    expect(entry.movements).toEqual([{ date_exigibilite: '2026-06-01' }])
    expect(entry.notifications).toEqual([activity(1)])
    expect(entry.openActionEvents).toEqual([activity(2, 'todo')])
  })

  test('keeps cached open actions and reports their refresh failure', async () => {
    const url = 'https://open-actions-failure.test'
    const key = repaymentTimelineCacheKey(url, 'CLI-1', 'LOC-1')
    invalidateRepaymentTimelineCache(url, 'CLI-1', 'LOC-1')
    setRepaymentTimelineCache(key, {
      movements: [],
      notifications: [],
      openActionEvents: [activity(8, 'todo')],
      movementsError: false,
      notificationsError: false,
      openActionsError: false
    })
    stubWindowApi({
      getRepaymentTimeline: async () => timelineResponse({ openActionsError: true })
    })

    const entry = await prefetchRepaymentTimeline({
      url,
      id_client: 'CLI-1',
      id_locataire: 'LOC-1',
      force: true
    })

    expect(entry.openActionEvents).toEqual([activity(8, 'todo')])
    expect(entry.openActionsError).toBe(true)
  })

  test('keeps cached movements when the ledger refresh fails', async () => {
    const url = 'https://ledger-failure.test'
    const key = repaymentTimelineCacheKey(url, 'CLI-1', 'LOC-1')
    invalidateRepaymentTimelineCache(url, 'CLI-1', 'LOC-1')
    setRepaymentTimelineCache(key, {
      movements: [{ date_exigibilite: '2026-06-01', montant_en_euros: 40 }],
      notifications: [activity(4, 'cached')],
      openActionEvents: [activity(5, 'todo')],
      movementsError: false,
      notificationsError: false,
      openActionsError: false
    })
    stubWindowApi({
      getRepaymentTimeline: async () =>
        timelineResponse({
          notifications: [activity(4, 'cached')],
          openActionEvents: [activity(5, 'todo')],
          movementsError: true
        })
    })

    const entry = await prefetchRepaymentTimeline({
      url,
      id_client: 'CLI-1',
      id_locataire: 'LOC-1',
      force: true
    })

    expect(entry.movements).toEqual([{ date_exigibilite: '2026-06-01', montant_en_euros: 40 }])
    expect(entry.movementsError).toBe(true)
    expect(entry.openActionEvents).toEqual([activity(5, 'todo')])
  })

  test('patches an activity and ignores a prefetch started before the patch', async () => {
    const url = 'https://patch-race.test'
    const key = repaymentTimelineCacheKey(url, 'CLI-1', 'LOC-1')
    invalidateRepaymentTimelineCache(url, 'CLI-1', 'LOC-1')
    setRepaymentTimelineCache(key, {
      movements: [],
      notifications: [activity(9, 'before')],
      openActionEvents: [],
      movementsError: false,
      notificationsError: false,
      openActionsError: false
    })
    const pending = deferred<ReturnType<typeof timelineResponse>>()
    stubWindowApi({
      getRepaymentTimeline: () => pending.promise
    })

    const stale = prefetchRepaymentTimeline({
      url,
      id_client: 'CLI-1',
      id_locataire: 'LOC-1',
      force: true
    })
    patchRepaymentTimelineActivity(key, {
      ...activity(9, 'boosted'),
      mentions: [{ destinataire: 'user:alice@exemple.fr', lu: true, boost: '👍', inbox: false }]
    })
    pending.resolve(timelineResponse({ notifications: [activity(9, 'stale')] }))
    await stale

    expect(getRepaymentTimelineCache(key)?.notifications[0]).toMatchObject({
      id: 9,
      contenu: 'boosted',
      mentions: [{ boost: '👍' }]
    })
  })

  test('does nothing when the patched activity is absent', () => {
    const key = repaymentTimelineCacheKey('https://missing.test', 'CLI-1', 'LOC-1')
    setRepaymentTimelineCache(key, {
      movements: [],
      notifications: [activity(1)],
      openActionEvents: [],
      movementsError: false,
      notificationsError: false,
      openActionsError: false
    })
    patchRepaymentTimelineActivity(key, activity(99, 'ghost'))
    expect(getRepaymentTimelineCache(key)?.notifications).toEqual([activity(1)])
  })
})
