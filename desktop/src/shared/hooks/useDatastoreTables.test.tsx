import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import type { DatastoreTableStatus } from '@/shared/types/datastore-tables'

import { useDatastoreTables } from './useDatastoreTables'

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

afterAll(() => {
  if (!installedDom) return
  const globals = globalThis as Record<string, unknown>
  delete globals.document
  delete globals.window
  delete globals.HTMLElement
  delete globals.getComputedStyle
})

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const TABLES: DatastoreTableStatus[] = [{ name: 'travaux', exists: true }]

describe('useDatastoreTables', () => {
  test('refetches when the view becomes visible', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')

    let calls = 0
    window.api = {
      getDatastoreTables: async () => {
        calls += 1
        return { tables: TABLES }
      }
    } as unknown as typeof window.api

    function Harness({ hidden }: { hidden: boolean }) {
      useDatastoreTables('https://pierre.test', !hidden)
      return null
    }

    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<Harness hidden />)
    })
    await act(async () => {
      await sleep(0)
    })
    expect(calls).toBe(0)

    await act(async () => {
      root.render(<Harness hidden={false} />)
    })
    await act(async () => {
      await sleep(0)
    })
    expect(calls).toBe(1)

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
