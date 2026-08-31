import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import { avatarTone } from '@/shared/lib/avatar/initials'

let installedDom = false
const originalGlobals = new Map<string, unknown>()

beforeAll(() => {
  if (typeof globalThis.document !== 'undefined') {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    return
  }

  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'https://pierre.test' })
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
    'cancelAnimationFrame',
    'Image'
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
  globalThis.Image = dom.window.Image
  globalThis.requestAnimationFrame = (callback) => window.setTimeout(callback, 0)
  globalThis.cancelAnimationFrame = (id) => window.clearTimeout(id)
  installedDom = true
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  if (!installedDom) return
  const globals = globalThis as Record<string, unknown>
  for (const [key, value] of originalGlobals) {
    if (value === undefined) delete globals[key]
    else globals[key] = value
  }
})

afterEach(() => {
  document.body.replaceChildren()
})

describe('UserAvatar', () => {
  test('renders initials from login when there is no photo', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { UserAvatar } = await import('./UserAvatar')

    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    await act(async () => {
      root.render(<UserAvatar name="Alice Martin" login="alice.martin" />)
    })

    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('[data-slot="avatar-fallback"]')?.textContent).toContain('AM')
    expect(host.querySelector('.sr-only')?.textContent).toBe('Alice Martin')
    const tone = avatarTone('alice.martin')
    const fallback = host.querySelector('[data-slot="avatar-fallback"]') as HTMLElement
    const r = Number.parseInt(tone.bg.slice(1, 3), 16)
    const g = Number.parseInt(tone.bg.slice(3, 5), 16)
    const b = Number.parseInt(tone.bg.slice(5, 7), 16)
    expect(fallback.style.backgroundColor).toBe(`rgb(${r}, ${g}, ${b})`)

    await act(async () => {
      root.unmount()
    })
  })

  test('shows the photo then falls back to initials on error', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { UserAvatar } = await import('./UserAvatar')

    class LoadedImage {
      complete = true
      naturalWidth = 16
      src = ''
      referrerPolicy = ''
      crossOrigin: string | null = null
      sizes = ''
      srcset = ''
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
    }
    const previousImage = window.Image
    window.Image = LoadedImage as unknown as typeof Image

    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    try {
      await act(async () => {
        root.render(
          <UserAvatar
            name="Alice Martin"
            login="alice.martin"
            photoUrl="data:image/png;base64,AAAA"
          />
        )
      })

      const img = host.querySelector('img')
      expect(img?.getAttribute('src')).toBe('data:image/png;base64,AAAA')

      await act(async () => {
        img!.dispatchEvent(new Event('error'))
      })

      expect(host.querySelector('img')).toBeNull()
      expect(host.querySelector('[data-slot="avatar-fallback"]')?.textContent).toContain('AM')
    } finally {
      window.Image = previousImage
      await act(async () => {
        root.unmount()
      })
    }
  })
})
