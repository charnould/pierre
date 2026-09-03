import { afterAll, beforeAll, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import { Toaster } from './toast'

const originalGlobals = new Map<string, unknown>()
let installedDom = false

beforeAll(() => {
  if (typeof document !== 'undefined') return
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  const globals = globalThis as Record<string, unknown>
  for (const key of ['document', 'window', 'HTMLElement', 'Element', 'Node', 'MutationObserver']) {
    originalGlobals.set(key, globals[key])
    globals[key] = dom.window[key as keyof typeof dom.window]
  }
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

test('keeps notifications above dialog and drawer layers through the public toaster', async () => {
  const { act } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)

  await act(async () => root.render(<Toaster />))
  expect(document.querySelector('[data-slot="toast-viewport"]')?.className).toContain('z-[100]')
  await act(async () => root.unmount())
  host.remove()
})
