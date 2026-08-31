import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'
import { MessageSquare } from 'lucide-react'

let installedDom = false
const originalGlobals = new Map<string, unknown>()

beforeAll(() => {
  const globals = globalThis as Record<string, unknown>
  if (typeof globals.document !== 'undefined') {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    return
  }
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

describe('InspectorComposeShell', () => {
  test('associe le titre au groupe et n’empile pas de Card', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { InspectorComposeShell } = await import('./inspector-compose-shell')

    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    await act(async () => {
      root.render(
        <InspectorComposeShell icon={MessageSquare} title="Laisser une note">
          <textarea aria-label="Note" />
        </InspectorComposeShell>
      )
    })

    const shell = host.querySelector('[data-inspector-compose-shell]')
    const title = host.querySelector('p')
    expect(shell).not.toBeNull()
    expect(title?.textContent).toBe('Laisser une note')
    expect(shell?.getAttribute('aria-labelledby')).toBe(title?.id)
    expect(host.querySelectorAll('[data-slot="card"]').length).toBe(0)
    expect(shell?.className).toContain('border-border/60')
    expect(shell?.className).toContain('rounded-md')

    await act(async () => {
      root.unmount()
    })
    host.remove()
  })
})
