import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import type { Tab } from './tabs'
import { nextVisitedTabs, useVisitedTabs } from './use-visited-tabs'

function tabs(...ids: Tab[]): ReadonlySet<Tab> {
  return new Set(ids)
}

describe('nextVisitedTabs', () => {
  test('keeps the first tab without allocating', () => {
    const visited = tabs('settings')
    expect(nextVisitedTabs(visited, 'settings', false)).toBe(visited)
  })

  test('adds the active tab while logged in', () => {
    const visited = tabs('settings')
    const next = nextVisitedTabs(visited, 'home', true)
    expect(next).not.toBe(visited)
    expect([...next].sort()).toEqual(['home', 'settings'])
  })

  test('does not recreate when the active tab is already visited', () => {
    const visited = tabs('settings', 'home', 'tickets')
    expect(nextVisitedTabs(visited, 'tickets', true)).toBe(visited)
    expect(nextVisitedTabs(visited, 'home', true)).toBe(visited)
  })

  test('logout drops métier tabs and keeps guest settings', () => {
    const visited = tabs('settings', 'home', 'tickets', 'chat')
    const next = nextVisitedTabs(visited, 'settings', false)
    expect([...next]).toEqual(['settings'])
  })

  test('logout does not keep a métier tab even if it is still active', () => {
    const visited = tabs('settings', 'tickets')
    const next = nextVisitedTabs(visited, 'tickets', false)
    expect([...next]).toEqual(['settings'])
  })
})

describe('useVisitedTabs', () => {
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
  })

  test('adds the active tab during render', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')

    const renders: ReadonlySet<Tab>[] = []
    function Harness({ tab, loggedIn }: { tab: Tab; loggedIn: boolean }) {
      renders.push(useVisitedTabs(tab, loggedIn))
      return null
    }

    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(<Harness tab="settings" loggedIn={false} />)
    })
    expect([...renders.at(-1)!]).toEqual(['settings'])

    await act(async () => {
      root.render(<Harness tab="tickets" loggedIn={true} />)
    })
    expect([...renders.at(-1)!].sort()).toEqual(['settings', 'tickets'])

    const afterAdd = renders.at(-1)!
    await act(async () => {
      root.render(<Harness tab="tickets" loggedIn={true} />)
    })
    expect(renders.at(-1)).toBe(afterAdd)

    await act(async () => {
      root.render(<Harness tab="settings" loggedIn={false} />)
    })
    expect([...renders.at(-1)!]).toEqual(['settings'])

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
