import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

let installedDom = false
const originalGlobals = new Map<string, unknown>()

beforeAll(() => {
  const globals = globalThis as Record<string, unknown>
  const existingWindow = globals.window as { setTimeout?: unknown; Element?: unknown } | undefined
  const hasWorkingDom =
    typeof globals.document !== 'undefined' && typeof existingWindow?.setTimeout === 'function'
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  if (hasWorkingDom) return
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  for (const key of ['document', 'window', 'HTMLElement', 'Element', 'Node']) {
    originalGlobals.set(key, globals[key])
  }
  globalThis.document = dom.window.document
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.Element = dom.window.Element
  globalThis.Node = dom.window.Node
  installedDom = true
})

afterAll(() => {
  if (!installedDom) return
  const globals = globalThis as Record<string, unknown>
  for (const [key, value] of originalGlobals) {
    if (value === undefined) delete globals[key]
    else globals[key] = value
  }
})

describe('ActivityRailProvider', () => {
  test('keeps the Inspector target when the bell is closed', async () => {
    const { act, useEffect } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { ActivityRailProvider, useActivityRail } = await import('./ActivityRailContext')

    let latest = ''
    function Probe() {
      const { contextTarget, open, openContextTarget, setOpen } = useActivityRail()
      useEffect(() => {
        latest = `${open}:${contextTarget?.view ?? 'none'}`
      })
      useEffect(() => {
        openContextTarget({ view: 'repayment', tenantId: 'LOC-1' })
        setOpen(false)
      }, [openContextTarget, setOpen])
      return null
    }

    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(
        <ActivityRailProvider>
          <Probe />
        </ActivityRailProvider>
      )
    })
    expect(latest).toBe('false:repayment')
    await act(async () => root.unmount())
    container.remove()
  })

  test('openRail sets the tab and opens the bell without an Inspector target', async () => {
    const { act, useEffect } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { ActivityRailProvider, useActivityRail } = await import('./ActivityRailContext')

    let latest = ''
    function Probe() {
      const { open, railTab, contextTarget, openRail } = useActivityRail()
      useEffect(() => {
        latest = `${open}:${railTab}:${contextTarget?.view ?? 'none'}`
      })
      return (
        <button type="button" onClick={() => openRail('activities')}>
          open
        </button>
      )
    }

    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(
        <ActivityRailProvider>
          <Probe />
        </ActivityRailProvider>
      )
    })
    expect(latest).toBe('false:notifications:none')
    await act(async () => {
      container.querySelector('button')?.click()
    })
    expect(latest).toBe('true:activities:none')
    await act(async () => root.unmount())
    container.remove()
  })

  test('openTasksRail opens the tasks drawer and closes the bell', async () => {
    const { act, useEffect } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { ActivityRailProvider, useActivityRail } = await import('./ActivityRailContext')

    let latest = ''
    function Probe() {
      const { open, tasksOpen, tasksTab, contextTarget, openRail, openTasksRail } =
        useActivityRail()
      useEffect(() => {
        latest = `${open}:${tasksOpen}:${tasksTab}:${contextTarget?.view ?? 'none'}`
      })
      return (
        <>
          <button type="button" data-open-bell="" onClick={() => openRail('notifications')}>
            bell
          </button>
          <button type="button" data-open-tasks="" onClick={() => openTasksRail('delegated')}>
            tasks
          </button>
        </>
      )
    }

    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(
        <ActivityRailProvider>
          <Probe />
        </ActivityRailProvider>
      )
    })
    expect(latest).toBe('false:false:mine:none')
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-open-bell]')?.click()
    })
    expect(latest).toBe('true:false:mine:none')
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-open-tasks]')?.click()
    })
    expect(latest).toBe('false:true:delegated:none')
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-open-bell]')?.click()
    })
    expect(latest).toBe('true:false:delegated:none')
    await act(async () => root.unmount())
    container.remove()
  })
})
