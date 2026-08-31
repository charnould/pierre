import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

let installedDom = false
const originalGlobals = new Map<string, unknown>()

beforeAll(() => {
  if (typeof globalThis.document !== 'undefined') return

  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  const globals = globalThis as Record<string, unknown>
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

describe('LoginPanel', () => {
  test('uses a page title and an intrinsic form stack', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { LoginPanel } = await import('./LoginPanel')

    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)

    await act(async () => {
      root.render(<LoginPanel settings={{}} onLogin={() => {}} />)
    })

    const heading = host.querySelector('h1')
    expect(heading?.textContent).toBe('Connexion')
    expect(heading?.className.split(/\s+/)).toContain('sr-only')
    expect(heading?.className).not.toContain('pierre-display')
    expect(host.querySelector('p.pierre-meta')).toBeNull()

    const mark = host.querySelector('[data-slot="login-mark"]')
    expect(mark).toBeTruthy()
    expect(mark?.getAttribute('aria-hidden')).toBe('true')
    const markClasses = (mark?.getAttribute('class') ?? '').split(/\s+/)
    expect(markClasses).toContain('h-16')
    expect(markClasses).toContain('w-auto')

    const form = host.querySelector('form')
    expect(form).toBeTruthy()
    expect(form?.className.split(/\s+/)).not.toContain('flex-1')
    expect(form?.className.split(/\s+/)).toContain('overflow-hidden')
    expect(form?.className.split(/\s+/)).not.toContain('overflow-y-auto')
    expect(form?.className.split(/\s+/)).not.toContain('max-w-2xl')

    expect(host.querySelectorAll('[data-slot="checkbox"]').length).toBe(2)
    const legalCopy = [...host.querySelectorAll('[data-slot="field-description"]')]
    expect(legalCopy).toHaveLength(2)
    expect(
      legalCopy.every((el) => {
        const classes = el.className.split(/\s+/)
        return (
          classes.includes('text-xs') &&
          classes.includes('leading-4') &&
          classes.includes('text-balance') &&
          !classes.includes('text-sm')
        )
      })
    ).toBe(true)

    expect(host.querySelector('#login-form-error')).toBeNull()
    expect(host.querySelectorAll('[data-slot="field-error"]').length).toBe(0)

    const fieldGroups = [...host.querySelectorAll('[data-slot="field-group"]')]
    expect(fieldGroups).toHaveLength(2)
    expect(fieldGroups[1]?.className.split(/\s+/)).toContain('gap-2')

    const submit = host.querySelector('button[type="submit"]')
    expect(submit?.textContent).toContain('Se connecter')
    expect(submit?.className.split(/\s+/)).toContain('w-fit')
    expect(submit?.className.split(/\s+/)).not.toContain('w-full')
    expect(submit?.hasAttribute('disabled')).toBe(false)

    await act(async () => {
      root.unmount()
    })
    host.remove()
  })
})
