import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import type { BulkReportDetail, BulkReportItem } from '@/shared/types/bulk-operations'

mock.module('@/features/activity/components/RepaymentActivityDrawer', () => ({
  RepaymentActivityDrawer: () => null
}))

const item = (overrides: Partial<BulkReportItem> = {}): BulkReportItem => ({
  id: 'job-1',
  executionId: 'run-1',
  itemId: 'LOC-42',
  source: 'comptes_locataires',
  mode: 'send',
  reportStatus: 'ko',
  outcome: { code: 'no_usable_route', skipped_steps: [{}, {}] },
  currentActivityId: 7,
  completedAt: '2026-08-28T12:00:00Z',
  runAt: null,
  attempts: 2,
  lastError: null,
  payload: {
    row: {
      route: { kind: 'fallback', medium: 'rcs', stepIndex: 0 }
    }
  },
  ...overrides
})

const detail = (overrides: Partial<BulkReportDetail> = {}): BulkReportDetail => ({
  report: {
    bulkOperationId: 'bulk-1',
    executionId: 'run-1',
    source: 'comptes_locataires',
    mode: 'send',
    status: 'partial',
    counts: { total: 1, in_progress: 0, ok: 0, ko: 1 },
    confirmedAt: '2026-08-28T12:00:00Z',
    completedAt: '2026-08-28T12:05:00Z',
    actor: 'alice',
    result: {
      execution_id: 'run-1',
      totals: { total: 1, queued: 0, no_usable_route: 1, applied: 0 }
    }
  },
  items: [item()],
  ...overrides
})

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const savedWindow = globalThis.window
const savedDocument = globalThis.document
const savedHTMLElement = globalThis.HTMLElement
const savedResizeObserver = globalThis.ResizeObserver

beforeAll(() => {
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
    ResizeObserver:
      savedResizeObserver ??
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
  })
})

afterAll(() => {
  Object.assign(globalThis, {
    window: savedWindow,
    document: savedDocument,
    HTMLElement: savedHTMLElement,
    ResizeObserver: savedResizeObserver
  })
})

describe('lignes du détail de rapport', () => {
  test('affiche identité, canal, statut, résultat et détail', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { BulkReportItemRow } = await import('@/features/outreach/components/BulkReports')
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <BulkReportItemRow item={item()} index={0} selected onSelect={() => {}} />
        </tbody>
      </table>
    )

    expect(html).toContain('LOC-42')
    expect(html).toContain('RCS')
    expect(html).toContain('Échoué')
    expect(html).toContain('Sans route exploitable')
    expect(html).toContain('2 canaux écartés')
    expect(html).toContain('data-state="selected"')
    expect(html).toContain('cursor-pointer')
  })

  test('le clic sur une ligne unitaire remonte l’item', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { BulkReportItemRow } = await import('@/features/outreach/components/BulkReports')
    let selectedId = ''
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <table>
          <tbody>
            <BulkReportItemRow
              item={item()}
              index={0}
              onSelect={(selected) => {
                selectedId = selected.itemId
              }}
            />
          </tbody>
        </table>
      )
    })

    const row = container.querySelector('tr')
    await act(async () => row?.click())
    expect(selectedId).toBe('LOC-42')
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})

describe('pile des exécutions', () => {
  test('empile les rubriques et les tables unitaires', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { BulkReportRunSection } = await import('@/features/outreach/components/BulkReports')
    const scroll = document.createElement('div')
    const scrollRef = { current: scroll }
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const first = detail()
    const second = detail({
      report: {
        ...detail().report,
        executionId: 'run-0',
        confirmedAt: '2026-08-27T09:00:00Z',
        actor: 'bob',
        counts: { total: 1, in_progress: 0, ok: 1, ko: 0 }
      },
      items: [item({ id: 'job-2', executionId: 'run-0', itemId: 'LOC-7', reportStatus: 'ok' })]
    })

    await act(async () => {
      root.render(
        <div>
          <BulkReportRunSection
            detail={first}
            selectedItemId={null}
            scrollRef={scrollRef}
            onSelectItem={() => {}}
          />
          <BulkReportRunSection
            detail={second}
            selectedItemId={null}
            scrollRef={scrollRef}
            onSelectItem={() => {}}
          />
        </div>
      )
    })

    expect(container.textContent).toContain('alice')
    expect(container.textContent).toContain('bob')
    expect(container.textContent).toContain('Identité')
    expect(container.textContent).toContain('1 échoué')
    expect(container.textContent).toContain('1 réussi')
    expect(container.querySelectorAll('table')).toHaveLength(2)
    expect(container.querySelectorAll('section')).toHaveLength(2)
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
