import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import type { Tab } from '@/shared/lib/tab-registry'
import type { UserPrincipal } from '@/shared/types/users'

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

const user: UserPrincipal = {
  email: 'a@b.c',
  isAdministrator: false,
  moduleIds: [],
  chatbotIds: []
}

async function renderTitleBar(options: {
  user: UserPrincipal | null
  activeTab?: Tab
  onTabChange?: (tab: Tab) => void
}) {
  const { act } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { TooltipProvider } = await import('@/shared/components/ui/tooltip')
  const { TitleBar } = await import('./TitleBar')

  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const onTabChange = options.onTabChange ?? (() => {})
  await act(async () => {
    root.render(
      <TooltipProvider>
        <TitleBar
          activeTab={options.activeTab ?? 'home'}
          user={options.user}
          onTabChange={onTabChange}
          notifications={<button type="button" aria-label="Notifications" />}
          tasks={<button type="button" aria-label="Tâches" />}
        />
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

describe('TitleBar', () => {
  test('shows no app controls when logged out', async () => {
    const view = await renderTitleBar({ user: null })
    expect(view.host.querySelectorAll('button')).toHaveLength(0)
    await view.unmount()
  })

  test('shows home, notifications and settings when logged in', async () => {
    const view = await renderTitleBar({ user })
    const labels = [...view.host.querySelectorAll('button')].map((button) =>
      button.getAttribute('aria-label')
    )
    expect(labels).toEqual(['Accueil', 'Tâches', 'Notifications', 'Paramètres', 'Manuel'])
    expect(view.host.querySelector('[aria-label="Accueil"]')?.getAttribute('aria-current')).toBe(
      'page'
    )
    await view.unmount()
  })

  test('shows administration for administrators', async () => {
    const view = await renderTitleBar({
      user: { ...user, isAdministrator: true }
    })
    const labels = [...view.host.querySelectorAll('button')].map((button) =>
      button.getAttribute('aria-label')
    )
    expect(labels).toEqual([
      'Accueil',
      'Tâches',
      'Notifications',
      'Paramètres',
      'Administration',
      'Manuel'
    ])
    await view.unmount()
  })

  test('navigates home from the Accueil control', async () => {
    const tabs: Tab[] = []
    const view = await renderTitleBar({
      user,
      activeTab: 'settings',
      onTabChange: (tab) => tabs.push(tab)
    })
    const home = view.host.querySelector<HTMLButtonElement>('[aria-label="Accueil"]')
    await view.act(async () => home?.click())
    expect(tabs).toEqual(['home'])
    await view.unmount()
  })

  test('opens the user manual in the default browser', async () => {
    const opened: string[] = []
    const previous = window.api
    window.api = {
      openExternal: async (url: string) => {
        opened.push(url)
        return true
      }
    } as unknown as typeof window.api
    const view = await renderTitleBar({ user })
    const manual = view.host.querySelector<HTMLButtonElement>('[aria-label="Manuel"]')
    await view.act(async () => manual?.click())
    expect(opened).toEqual([
      'https://github.com/charnould/pierre/blob/docs/master/docs/07-user-manual/index.md'
    ])
    window.api = previous
    await view.unmount()
  })
})
