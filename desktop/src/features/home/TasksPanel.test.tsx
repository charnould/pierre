import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import type { ActionActivity } from '@/shared/lib/activities/action-activity'
import type { Activity } from '@/shared/types/activites'

let installedDom = false
const originalGlobals = new Map<string, unknown>()

beforeAll(() => {
  const globals = globalThis as Record<string, unknown>
  const existingWindow = globals.window as { setTimeout?: unknown } | undefined
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  if (typeof globals.document !== 'undefined' && typeof existingWindow?.setTimeout === 'function') {
    return
  }
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  for (const key of ['document', 'window', 'HTMLElement', 'Element', 'Node', 'MouseEvent']) {
    originalGlobals.set(key, globals[key])
  }
  globalThis.document = dom.window.document
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.Element = dom.window.Element
  globalThis.Node = dom.window.Node
  globalThis.MouseEvent = dom.window.MouseEvent
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

function task(id: number, title: string): ActionActivity {
  return {
    row: { id, createdAt: '2026-09-01T00:00:00.000Z' } as Activity,
    contenu: {
      version: 2,
      task: { title, state: 'open', due_date: '2099-01-01' }
    },
    event: 'task.created',
    state: 'open',
    threadId: `thread-${id}`,
    revision: 1,
    createdBy: 'user:alice@exemple.fr'
  }
}

function visiblePanel(): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>('[role="tabpanel"]')].find(
    (panel) => !panel.hasAttribute('hidden')
  )
}

describe('TasksPanel', () => {
  test('switches between my tasks and assigned tasks, then closes', async () => {
    const { act, useEffect } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { TasksPanel } = await import('./TasksPanel')
    const { ActivityRailProvider, useActivityRail } =
      await import('@/features/activity/lib/ActivityRailContext')

    function OpenPanel() {
      const { setTasksOpen } = useActivityRail()
      useEffect(() => setTasksOpen(true), [setTasksOpen])
      return null
    }

    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(
        <ActivityRailProvider>
          <OpenPanel />
          <TasksPanel mine={[task(1, 'Relancer le locataire')]} delegated={[task(2, 'Assignée')]} />
        </ActivityRailProvider>
      )
    })

    try {
      const tabs = [...document.querySelectorAll<HTMLElement>('[role="tab"]')]
      expect(tabs.map((tab) => tab.textContent)).toEqual(['Mes tâches', 'Tâches assignées'])
      expect(tabs).toHaveLength(2)
      expect(tabs[0]?.getAttribute('aria-selected')).toBe('true')
      expect(visiblePanel()?.textContent).toContain('Relancer le locataire')
      expect(visiblePanel()?.textContent).not.toContain('Assignée')
      expect(visiblePanel()?.querySelector('.scroll-fade')).not.toBeNull()
      const popup = document.querySelector<HTMLElement>('[data-slot="drawer-popup"]')
      expect(popup?.className).toContain('bg-background')
      expect(popup?.className).toContain('shadow-md')
      expect(popup?.className).toContain('[--drawer-inset:1rem]')
      expect(document.querySelector('[role="tablist"]')?.className).toContain('rounded-md')

      await act(async () => {
        tabs[1]?.click()
      })
      expect(tabs[1]?.getAttribute('aria-selected')).toBe('true')
      expect(visiblePanel()?.textContent).toContain('Assignée')
      expect(visiblePanel()?.textContent).not.toContain('Relancer le locataire')

      await act(async () => {
        document.querySelector<HTMLButtonElement>('[aria-label="Fermer les tâches"]')?.click()
      })
      expect(document.querySelector('[data-slot="drawer-popup"]')).toBeNull()
    } finally {
      await act(async () => root.unmount())
      container.remove()
    }
  })
})
