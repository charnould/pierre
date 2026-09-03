import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'
import { useState } from 'react'

import { AgentIdentityProvider } from '@/contexts/AgentIdentityContext'
import { mascotBodyPath } from '@/mascot/profiles'
import { MentionText } from '@/shared/components/inspector/mention-text'
import { MentionTextarea } from '@/shared/components/inspector/mention-textarea'
import { clearOrgUsersCache } from '@/shared/lib/org-users-cache'

let installedDom = false
let installedResizeObserver = false
const originalGlobals = new Map<string, unknown>()

beforeAll(() => {
  const globals = globalThis as Record<string, unknown>
  const currentWindow = globals.window as
    | { setTimeout?: unknown; Element?: unknown; HTMLElement?: unknown }
    | undefined
  const documentWindow =
    typeof globals.document === 'undefined'
      ? undefined
      : (globalThis.document.defaultView as
          | { Element?: unknown; HTMLElement?: unknown }
          | undefined)
  const hasWorkingDom =
    typeof globals.document !== 'undefined' &&
    typeof currentWindow?.setTimeout === 'function' &&
    typeof currentWindow.Element === 'function' &&
    typeof currentWindow.HTMLElement === 'function' &&
    typeof documentWindow?.Element === 'function' &&
    typeof documentWindow.HTMLElement === 'function'

  if (!hasWorkingDom) {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://pierre.test'
    })
    for (const key of [
      'document',
      'window',
      'HTMLElement',
      'HTMLTextAreaElement',
      'Element',
      'Node',
      'Event',
      'MouseEvent',
      'KeyboardEvent',
      'MutationObserver',
      'getComputedStyle'
    ]) {
      originalGlobals.set(key, globals[key])
    }
    globalThis.document = dom.window.document
    globalThis.window = dom.window as unknown as Window & typeof globalThis
    globalThis.HTMLElement = dom.window.HTMLElement
    globalThis.HTMLTextAreaElement = dom.window.HTMLTextAreaElement
    globalThis.Element = dom.window.Element
    globalThis.Node = dom.window.Node
    globalThis.Event = dom.window.Event
    globalThis.MouseEvent = dom.window.MouseEvent
    globalThis.KeyboardEvent = dom.window.KeyboardEvent
    globalThis.MutationObserver = dom.window.MutationObserver
    globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
    installedDom = true
  }
  if (!globalThis.HTMLElement.prototype.scrollIntoView) {
    globalThis.HTMLElement.prototype.scrollIntoView = () => {}
  }
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    installedResizeObserver = true
  }
  globalThis.requestAnimationFrame = (callback) => window.setTimeout(callback, 0)
  globalThis.cancelAnimationFrame = (id) => window.clearTimeout(id)
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
  clearOrgUsersCache()
  document.body.replaceChildren()
})

afterAll(() => {
  if (installedResizeObserver) {
    delete (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver
  }
  if (!installedDom) return
  const globals = globalThis as Record<string, unknown>
  for (const [key, value] of originalGlobals) {
    if (value === undefined) delete globals[key]
    else globals[key] = value
  }
})

function Harness() {
  const [value, setValue] = useState('')
  return (
    <AgentIdentityProvider name="Pierre">
      <MentionTextarea
        value={value}
        onChange={setValue}
        aria-label="Note"
        url="https://pierre.test"
      />
    </AgentIdentityProvider>
  )
}

async function typeMention(
  act: (callback: () => void | Promise<void>) => Promise<void>,
  textarea: HTMLTextAreaElement,
  value: string
) {
  await act(async () => {
    const native = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')
    native?.set?.call(textarea, value)
    textarea.setSelectionRange(value.length, value.length)
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0))
  })
}

describe('MentionTextarea', () => {
  test('selects the configured agent with the keyboard', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)

    await act(async () => root.render(<Harness />))
    const textarea = host.querySelector('textarea')!
    await typeMention(act, textarea, '@pi')

    const option = document.querySelector('[role="option"]')
    expect(option?.textContent).toContain('Pierre')
    expect(option?.querySelector('svg')).toBeTruthy()

    await act(async () => {
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(textarea.value).toBe('@pierre ')

    await act(async () => root.unmount())
  })

  test('selects the configured agent with the mouse', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)

    await act(async () => root.render(<Harness />))
    const textarea = host.querySelector('textarea')!
    await typeMention(act, textarea, '@pier')

    const option = document.querySelector<HTMLElement>('[role="option"]')
    expect(option).toBeTruthy()
    await act(async () => option?.click())
    expect(textarea.value).toBe('@pierre ')

    await act(async () => root.unmount())
  })

  test('renders the agent mention with its configured name and companion avatar', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)

    await act(async () => {
      root.render(
        <AgentIdentityProvider name="Pierre">
          <MentionText text="Avec @pierre" />
          <MentionText text="Pour @pierre" inline mentionVariant="inline" />
        </AgentIdentityProvider>
      )
    })

    expect(host.textContent).toContain('Avec Pierre')
    expect(host.textContent).toContain('Pour Pierre')
    const svg = host.querySelector('svg')
    expect(svg?.getAttribute('viewBox')).toBe('-50 -50 100 100')
    expect(host.innerHTML).toContain(mascotBodyPath('cercle'))

    await act(async () => root.unmount())
  })
})
