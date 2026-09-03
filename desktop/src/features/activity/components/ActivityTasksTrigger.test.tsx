import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

let installedDom = false
const originalGlobals = new Map<string, unknown>()

beforeAll(() => {
  const globals = globalThis as Record<string, unknown>
  const existingWindow = globals.window as { setTimeout?: unknown; Element?: unknown } | undefined
  const hasWorkingDom =
    typeof globals.document !== 'undefined' &&
    typeof existingWindow?.setTimeout === 'function' &&
    typeof globals.Element === 'function'

  if (!hasWorkingDom) {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost/'
    })
    for (const key of [
      'document',
      'window',
      'HTMLElement',
      'Element',
      'Node',
      'Event',
      'MouseEvent',
      'MutationObserver',
      'getComputedStyle',
      'requestAnimationFrame',
      'cancelAnimationFrame'
    ]) {
      originalGlobals.set(key, globals[key])
    }

    globalThis.document = dom.window.document
    globalThis.window = dom.window as unknown as Window & typeof globalThis
    globalThis.HTMLElement = dom.window.HTMLElement
    globalThis.Element = dom.window.Element
    globalThis.Node = dom.window.Node
    globalThis.Event = dom.window.Event
    globalThis.MouseEvent = dom.window.MouseEvent
    globalThis.MutationObserver = dom.window.MutationObserver
    globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
    globalThis.requestAnimationFrame = (callback) => window.setTimeout(callback, 0)
    globalThis.cancelAnimationFrame = (id) => window.clearTimeout(id)
    installedDom = true
  }

  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false
    })) as typeof window.matchMedia
  }

  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterAll(() => {
  if (!installedDom) return
  const globals = globalThis as Record<string, unknown>
  for (const [key, value] of originalGlobals) {
    if (value === undefined) delete globals[key]
    else globals[key] = value
  }
})

async function renderTrigger() {
  const { act, useEffect } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { ActivityRailProvider, useActivityRail } =
    await import('@/features/activity/lib/ActivityRailContext')
  const { TooltipProvider } = await import('@/shared/components/ui/tooltip')
  const { ActivityTasksTrigger } =
    await import('@/features/activity/components/ActivityTasksTrigger')

  const rail = { tasksOpen: false, tasksTab: 'mine' as const }
  function Probe() {
    const { tasksOpen, tasksTab } = useActivityRail()
    useEffect(() => {
      rail.tasksOpen = tasksOpen
      rail.tasksTab = tasksTab
    })
    return null
  }

  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  await act(async () => {
    root.render(
      <TooltipProvider>
        <ActivityRailProvider>
          <Probe />
          <ActivityTasksTrigger />
        </ActivityRailProvider>
      </TooltipProvider>
    )
  })

  return {
    act,
    host,
    rail,
    async unmount() {
      await act(async () => {
        root.unmount()
      })
      host.remove()
    }
  }
}

describe('ActivityTasksTrigger', () => {
  test('opens the tasks rail on mine and toggles it shut', async () => {
    const trigger = await renderTrigger()
    const button = trigger.host.querySelector<HTMLButtonElement>('button')

    expect(button?.getAttribute('aria-label')).toBe('Tâches')
    expect(button?.getAttribute('aria-pressed')).toBe('false')
    expect(trigger.rail.tasksOpen).toBe(false)
    await trigger.act(async () => button?.click())
    expect(trigger.rail.tasksOpen).toBe(true)
    expect(trigger.rail.tasksTab).toBe('mine')
    expect(button?.getAttribute('aria-pressed')).toBe('true')
    await trigger.act(async () => button?.click())
    expect(trigger.rail.tasksOpen).toBe(false)
    expect(button?.getAttribute('aria-pressed')).toBe('false')

    await trigger.unmount()
  })
})
