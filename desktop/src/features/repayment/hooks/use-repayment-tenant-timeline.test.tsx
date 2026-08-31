import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import type { LedgerMovementRow } from '@/shared/types/ledger'

import { invalidateRepaymentTimelineCache } from '../lib/repayment-timeline-cache'
import { useRepaymentTenantTimeline } from './use-repayment-tenant-timeline'

let installedDom = false

beforeAll(() => {
  const globals = globalThis as Record<string, unknown>
  const existingWindow = globals.window as { setTimeout?: unknown } | undefined
  const hasWorkingDom =
    typeof globals.document !== 'undefined' && typeof existingWindow?.setTimeout === 'function'

  if (!hasWorkingDom) {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    globalThis.document = dom.window.document
    globalThis.window = dom.window as unknown as Window & typeof globalThis
    globalThis.HTMLElement = dom.window.HTMLElement
    globalThis.Element = dom.window.Element
    globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
    installedDom = true
  }
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterAll(() => {
  if (!installedDom) return
  const globals = globalThis as Record<string, unknown>
  delete globals.document
  delete globals.window
  delete globals.HTMLElement
  delete globals.Element
  delete globals.getComputedStyle
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const timelineResponse = (movements: LedgerMovementRow[]) => ({
  data: { movements, notifications: [], openActionEvents: [] },
  errors: { movements: false, notifications: false, openActions: false }
})

describe('useRepaymentTenantTimeline', () => {
  test('forced refresh supersedes an older request', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const url = 'https://hook-ordering.test'
    invalidateRepaymentTimelineCache(url, 'CLI-1', 'LOC-1')

    const requests = [
      deferred<ReturnType<typeof timelineResponse>>(),
      deferred<ReturnType<typeof timelineResponse>>()
    ]
    let requestIndex = 0
    window.api = {
      getRepaymentTimeline: () => requests[requestIndex++]!.promise
    } as unknown as typeof window.api

    const renders: ReturnType<typeof useRepaymentTenantTimeline>[] = []
    function Harness() {
      renders.push(useRepaymentTenantTimeline(url, 'CLI-1', 'LOC-1'))
      return null
    }

    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(<Harness />)
    })
    expect(requestIndex).toBe(1)

    let forcedRefresh!: Promise<{
      ok: boolean
      movementsError: boolean
      notificationsError: boolean
      openActionsError: boolean
    }>
    await act(async () => {
      forcedRefresh = renders.at(-1)!.refresh({ force: true })
      await Promise.resolve()
    })
    expect(requestIndex).toBe(2)

    requests[1]!.resolve(
      timelineResponse([{ date_exigibilite: '2026-06-01', montant_en_euros: 200 }])
    )
    await act(async () => {
      await forcedRefresh
    })
    expect(renders.at(-1)!.movements[0]?.date_exigibilite).toBe('2026-06-01')

    requests[0]!.resolve(
      timelineResponse([{ date_exigibilite: '2026-05-01', montant_en_euros: 100 }])
    )
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(renders.at(-1)!.movements[0]?.date_exigibilite).toBe('2026-06-01')

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  test('keeps displayed rows while a forced refresh is in flight', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { setRepaymentTimelineCache, repaymentTimelineCacheKey } =
      await import('../lib/repayment-timeline-cache')
    const url = 'https://keep-ready.test'
    invalidateRepaymentTimelineCache(url, 'CLI-1', 'LOC-1')
    setRepaymentTimelineCache(repaymentTimelineCacheKey(url, 'CLI-1', 'LOC-1'), {
      movements: [{ date_exigibilite: '2026-06-01', montant_en_euros: 10 }],
      notifications: [
        {
          id: 7,
          date_creation: '2026-08-17T10:00:00',
          rattachement: 'repayment:LOC-1',
          auteur: 'user:bob@exemple.fr',
          id_client: 'CLI-1',
          id_locataire: 'LOC-1',
          id_lot: null,
          type: 'note',
          statut: 'logged',
          mentions: [],
          contenu: 'Relance'
        }
      ],
      openActionEvents: [],
      movementsError: false,
      notificationsError: false,
      openActionsError: false
    })

    const pending = deferred<ReturnType<typeof timelineResponse>>()
    window.api = {
      getRepaymentTimeline: () => pending.promise
    } as unknown as typeof window.api

    const renders: ReturnType<typeof useRepaymentTenantTimeline>[] = []
    function Harness() {
      renders.push(useRepaymentTenantTimeline(url, 'CLI-1', 'LOC-1'))
      return null
    }

    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(<Harness />)
    })
    expect(renders.at(-1)!.initialLoading).toBe(false)
    expect(renders.at(-1)!.notifications).toHaveLength(1)

    await act(async () => {
      void renders.at(-1)!.refresh({ force: true })
      await Promise.resolve()
    })
    expect(renders.at(-1)!.initialLoading).toBe(false)
    expect(renders.at(-1)!.refreshing).toBe(true)
    expect(renders.at(-1)!.notifications[0]?.id).toBe(7)

    pending.resolve(timelineResponse([{ date_exigibilite: '2026-07-01', montant_en_euros: 20 }]))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  test('applyActivityPatch updates mentions without going through loading', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { setRepaymentTimelineCache, repaymentTimelineCacheKey } =
      await import('../lib/repayment-timeline-cache')
    const url = 'https://apply-patch.test'
    invalidateRepaymentTimelineCache(url, 'CLI-1', 'LOC-1')
    const note = {
      id: 8,
      date_creation: '2026-08-17T10:00:00',
      rattachement: 'repayment:LOC-1',
      auteur: 'user:bob@exemple.fr',
      id_client: 'CLI-1',
      id_locataire: 'LOC-1',
      id_lot: null,
      type: 'note' as const,
      statut: 'logged' as const,
      mentions: [] as {
        destinataire: string
        lu: boolean
        boost: string | null
        inbox?: boolean
      }[],
      contenu: 'Relance'
    }
    setRepaymentTimelineCache(repaymentTimelineCacheKey(url, 'CLI-1', 'LOC-1'), {
      movements: [],
      notifications: [note],
      openActionEvents: [],
      movementsError: false,
      notificationsError: false,
      openActionsError: false
    })
    window.api = {
      getRepaymentTimeline: async () => ({
        data: { movements: [], notifications: [note], openActionEvents: [] },
        errors: { movements: false, notifications: false, openActions: false }
      })
    } as unknown as typeof window.api

    const renders: ReturnType<typeof useRepaymentTenantTimeline>[] = []
    function Harness() {
      renders.push(useRepaymentTenantTimeline(url, 'CLI-1', 'LOC-1'))
      return null
    }
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(<Harness />)
    })

    await act(async () => {
      renders.at(-1)!.applyActivityPatch({
        ...note,
        mentions: [{ destinataire: 'user:alice@exemple.fr', lu: true, boost: '👏', inbox: false }]
      })
    })
    expect(renders.at(-1)!.initialLoading).toBe(false)
    expect(renders.at(-1)!.notifications[0]?.mentions[0]?.boost).toBe('👏')

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
