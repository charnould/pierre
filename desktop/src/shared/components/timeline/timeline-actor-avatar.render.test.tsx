import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import { mascotBodyPaint } from '@/mascot/look'
import { mascotBodyPath } from '@/mascot/profiles'

const MASCOT_COLOR = '#5b8c5a' as const

mock.module('@/contexts/UiSettingsContext', () => ({
  useUiSettings: () => ({
    settings: { mascot: { shape: 'galet', color: MASCOT_COLOR } }
  }),
  useResolvedUiSettings: () => ({
    mascot: { shape: 'galet', color: MASCOT_COLOR }
  })
}))

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
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
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

async function renderActor(kind: 'agent' | 'database', size: 'default' | 'lg' = 'lg') {
  const { act } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { TooltipProvider } = await import('@/shared/components/ui/tooltip')
  const { TimelineActorAvatar } = await import('./timeline-actor-avatar')

  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  await act(async () => {
    root.render(
      <TooltipProvider>
        <TimelineActorAvatar
          actor={{ kind, id: kind, label: kind === 'agent' ? 'Bot' : 'Base de données' }}
          size={size}
        />
      </TooltipProvider>
    )
  })

  return {
    host,
    async unmount() {
      await act(async () => {
        root.unmount()
      })
      host.remove()
    }
  }
}

describe('TimelineActorAvatar', () => {
  test('Pierre uses the companion circle cropped to the body, tinted from settings', async () => {
    const { host, unmount } = await renderActor('agent')
    const svg = host.querySelector('svg')
    expect(svg?.getAttribute('viewBox')).toBe('-50 -50 100 100')
    expect(host.innerHTML).toContain(mascotBodyPath('cercle'))
    expect(host.innerHTML).not.toContain(mascotBodyPath('galet'))
    expect(host.innerHTML.toLowerCase()).toContain(mascotBodyPaint(MASCOT_COLOR).vol.mid)
    await unmount()
  })

  test('Inspector default uses the size-8 hit target', async () => {
    const { host, unmount } = await renderActor('agent', 'default')
    const trigger = host.querySelector('span')
    expect(trigger?.className).toContain('size-8')
    expect(trigger?.className).not.toContain('size-10')
    await unmount()
  })

  test('database facts use the BookMarked stamp', async () => {
    const { host, unmount } = await renderActor('database')
    const icon = host.querySelector('svg')
    const className = icon?.className.baseVal ?? icon?.getAttribute('class') ?? ''
    expect(className).toContain('lucide-book-marked')
    await unmount()
  })
})
