import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import {
  prefersReducedMotion,
  scrollBehavior,
  usePrefersReducedMotion
} from './prefers-reduced-motion'

let installedDom = false

beforeAll(() => {
  if (
    typeof globalThis.window !== 'undefined' &&
    typeof globalThis.window.matchMedia === 'function'
  ) {
    return
  }
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  installedDom = true
})

afterAll(() => {
  if (!installedDom) return
  delete (globalThis as { window?: Window }).window
  delete (globalThis as { document?: Document }).document
})

describe('prefers-reduced-motion', () => {
  test('uses instant scroll when the user prefers reduced motion', () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false
      }
    })) as unknown as typeof window.matchMedia

    try {
      expect(prefersReducedMotion()).toBe(true)
      expect(scrollBehavior()).toBe('auto')
    } finally {
      window.matchMedia = original
    }
  })

  test('keeps smooth scroll when motion is allowed', () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false
      }
    })) as typeof window.matchMedia

    try {
      expect(prefersReducedMotion()).toBe(false)
      expect(scrollBehavior()).toBe('smooth')
    } finally {
      window.matchMedia = original
    }
  })

  test('reacts when the media preference changes', async () => {
    const original = window.matchMedia
    const listeners = new Set<() => void>()
    let matches = false
    window.matchMedia = ((query: string) => ({
      get matches() {
        return matches
      },
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener(_type: string, listener: () => void) {
        listeners.add(listener)
      },
      removeEventListener(_type: string, listener: () => void) {
        listeners.delete(listener)
      },
      dispatchEvent() {
        return false
      }
    })) as unknown as typeof window.matchMedia

    const { act, createElement } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)

    function Probe() {
      const reduceMotion = usePrefersReducedMotion()
      return createElement('span', { 'data-reduce-motion': reduceMotion })
    }

    try {
      await act(async () => root.render(createElement(Probe)))
      expect(host.querySelector('span')?.dataset.reduceMotion).toBe('false')

      matches = true
      await act(async () => {
        for (const listener of listeners) listener()
      })
      expect(host.querySelector('span')?.dataset.reduceMotion).toBe('true')
    } finally {
      await act(async () => root.unmount())
      host.remove()
      window.matchMedia = original
    }
  })
})
