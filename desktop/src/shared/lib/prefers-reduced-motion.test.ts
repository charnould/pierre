import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import { prefersReducedMotion, scrollBehavior } from './prefers-reduced-motion'

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
  installedDom = true
})

afterAll(() => {
  if (!installedDom) return
  delete (globalThis as { window?: Window }).window
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
    })) as typeof window.matchMedia

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
})
