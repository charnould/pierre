import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'

mock.module('@/contexts/UiSettingsContext', () => ({
  useResolvedUiSettings: () => ({ mascot: { badgeColor: '#ff6a45' } })
}))

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

async function renderTrigger(unreadCount: number) {
  const { act } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { ActivityRailProvider } = await import('@/features/activity/lib/ActivityRailContext')
  const { TooltipProvider } = await import('@/shared/components/ui/tooltip')
  const { ActivityNotificationsTrigger } =
    await import('@/features/activity/components/ActivityNotificationsTrigger')

  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  await act(async () => {
    root.render(
      <TooltipProvider>
        <ActivityRailProvider>
          <ActivityNotificationsTrigger unreadCount={unreadCount} />
        </ActivityRailProvider>
      </TooltipProvider>
    )
  })

  return {
    act,
    host,
    async unmount() {
      await act(async () => {
        root.unmount()
      })
      host.remove()
    }
  }
}

describe('ActivityNotificationsTrigger', () => {
  test('toggles the notification center from the bell', async () => {
    const trigger = await renderTrigger(0)
    const button = trigger.host.querySelector<HTMLButtonElement>('button')

    expect(button?.getAttribute('aria-pressed')).toBe('false')
    await trigger.act(async () => button?.click())
    expect(button?.getAttribute('aria-pressed')).toBe('true')
    await trigger.act(async () => button?.click())
    expect(button?.getAttribute('aria-pressed')).toBe('false')

    await trigger.unmount()
  })

  test('never fills the bell, unread or not', async () => {
    const unread = await renderTrigger(2)
    const unreadClass =
      unread.host.querySelector('svg')?.className.baseVal ??
      unread.host.querySelector('svg')?.getAttribute('class') ??
      ''
    expect(unreadClass).not.toContain('fill-unread')
    const unreadDot = unread.host.querySelector('[data-unread-dot]')
    expect(unread.host.querySelector('[data-slot="badge"]')).toBeNull()
    expect(unreadDot).not.toBeNull()
    expect((unreadDot as HTMLElement | null)?.style.getPropertyValue('--mascot-badge')).toBe(
      '#ff6a45'
    )
    expect(unread.host.querySelector('button')?.getAttribute('aria-label')).toBe(
      'Notifications, 2 non-lues'
    )
    await unread.unmount()

    const read = await renderTrigger(0)
    const readClass =
      read.host.querySelector('svg')?.className.baseVal ??
      read.host.querySelector('svg')?.getAttribute('class') ??
      ''
    expect(readClass).not.toContain('fill-unread')
    expect(read.host.querySelector('[data-slot="badge"]')).toBeNull()
    expect(read.host.querySelector('[data-unread-dot]')).toBeNull()
    expect(read.host.querySelector('button')?.getAttribute('aria-label')).toBe('Notifications')
    await read.unmount()
  })
})
