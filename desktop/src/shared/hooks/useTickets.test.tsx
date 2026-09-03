import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import type { ColumnFilters } from '@/shared/lib/ui-settings/tickets-table'
import type { TicketsListResponse } from '@/shared/types'
import type { TicketsQueryParams } from '@/shared/types/tickets'

import { useTickets } from './useTickets'

let installedDom = false

beforeAll(() => {
  if (typeof globalThis.document === 'undefined') {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    globalThis.document = dom.window.document
    globalThis.window = dom.window as unknown as Window & typeof globalThis
    globalThis.HTMLElement = dom.window.HTMLElement
    globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
    installedDom = true
  }
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

// Other suites in this process assert on `document` being absent, so put the
// globals back the way they were.
afterAll(() => {
  if (!installedDom) return
  const globals = globalThis as Record<string, unknown>
  delete globals.document
  delete globals.window
  delete globals.HTMLElement
  delete globals.getComputedStyle
})

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function response(marker: string): TicketsListResponse {
  return {
    data: [{ id_reclamation: marker }],
    meta: {
      total: 1,
      limit: 50,
      offset: 0,
      columns: [{ name: 'id_reclamation', type: 'TEXT' }],
      default_sort: 'id_reclamation'
    }
  }
}

type TicketsApi = ReturnType<typeof useTickets>

/**
 * Serves the first `getTickets` call slowly and every later one quickly, so the
 * older request always resolves last.
 */
function installOutOfOrderApi(delays: number[], markers: string[]) {
  let call = 0
  window.api = {
    getTickets: async () => {
      const index = call
      call += 1
      await sleep(delays[index] ?? 0)
      return response(markers[index] ?? 'unknown')
    }
  } as unknown as typeof window.api
  return () => call
}

describe('useTickets out-of-order responses', () => {
  test('a slow earlier response does not overwrite a newer one', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')

    const callCount = installOutOfOrderApi([80, 5], ['stale-first', 'fresh-second'])

    const renders: TicketsApi[] = []
    function Harness({ filters }: { filters: ColumnFilters }) {
      renders.push(useTickets('https://pierre.test', false, { columnFilters: filters }))
      return null
    }

    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    // First request starts and is still in flight.
    await act(async () => {
      root.render(<Harness filters={{ motif: ['fuite'] }} />)
    })

    // The user changes the filter before the first response arrives.
    await act(async () => {
      root.render(<Harness filters={{ motif: ['bruit'] }} />)
    })

    // Let both responses land, slow one last.
    await act(async () => {
      await sleep(200)
    })

    expect(callCount()).toBe(2)

    const final = renders[renders.length - 1]!
    expect(final.data).toHaveLength(1)
    expect(final.data[0]!.id_reclamation).toBe('fresh-second')
    // The stale run must not have left the spinner on or an error behind.
    expect(final.loading).toBe(false)
    expect(final.error).toBeNull()

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  test('returns to the last valid page when a bucket shrinks after refresh', async () => {
    const { act, useEffect } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const offsets: number[] = []
    let shrunk = false
    window.api = {
      getTickets: async (params: TicketsQueryParams) => {
        offsets.push(params.offset ?? 0)
        return {
          data: shrunk ? [] : [{ id_reclamation: params.offset ? 'last' : 'first' }],
          meta: {
            total: shrunk ? 0 : 151,
            limit: 150,
            offset: params.offset ?? 0,
            columns: [{ name: 'id_reclamation', type: 'TEXT' }],
            default_sort: 'id_reclamation'
          }
        }
      }
    } as unknown as typeof window.api

    let latest: TicketsApi | null = null
    function Harness({ refreshNonce }: { refreshNonce: number }) {
      const value = useTickets('https://pierre.test', false, {
        bucket: 'en_cours',
        refreshNonce
      })
      useEffect(() => {
        latest = value
      }, [value])
      return null
    }

    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => root.render(<Harness refreshNonce={0} />))
    await act(async () => latest?.nextPage())
    shrunk = true
    await act(async () => root.render(<Harness refreshNonce={1} />))
    await act(async () => sleep(0))

    expect(offsets).toEqual([0, 150, 150, 0])

    await act(async () => root.unmount())
    container.remove()
  })
})
