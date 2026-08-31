import { afterAll, afterEach } from 'bun:test'

import { JSDOM } from 'jsdom'

/**
 * One JSDOM for the worker. React 19’s selection plugin reads the free
 * identifier `window`; suites that `delete globalThis.window` after unmount
 * leave a pending jsdom `selectionchange` that then throws
 * `ReferenceError: window is not defined` on the next file.
 */
const GLOBAL_KEYS = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLButtonElement',
  'HTMLTextAreaElement',
  'HTMLCanvasElement',
  'HTMLImageElement',
  'HTMLDivElement',
  'HTMLBRElement',
  'Image',
  'Element',
  'Node',
  'Event',
  'InputEvent',
  'MouseEvent',
  'KeyboardEvent',
  'PointerEvent',
  'FocusEvent',
  'CustomEvent',
  'MutationObserver',
  'DOMParser',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame'
] as const

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'https://pierre.test',
  pretendToBeVisual: true
})

function stubMatchMedia(target: Window) {
  if (typeof target.matchMedia === 'function') return
  target.matchMedia = ((query: string) => ({
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
  })) as typeof target.matchMedia
}

function stubObserver(
  name: 'IntersectionObserver' | 'ResizeObserver',
  methods: { observe(): void; unobserve(): void; disconnect(): void; takeRecords?(): [] }
) {
  if (typeof (globalThis as Record<string, unknown>)[name] === 'function') return
  ;(globalThis as Record<string, unknown>)[name] = class {
    observe = methods.observe
    unobserve = methods.unobserve
    disconnect = methods.disconnect
    takeRecords = methods.takeRecords ?? (() => [])
    root = null
    rootMargin = ''
    scrollMargin = ''
    thresholds = []
  }
}

function applyDom() {
  const { window } = dom
  window.scrollTo = () => {}
  stubMatchMedia(window)

  const globals = globalThis as Record<string, unknown>
  const win = window as unknown as Record<string, unknown>
  for (const key of GLOBAL_KEYS) {
    if (key === 'document') globals.document = window.document
    else if (key === 'getComputedStyle')
      globals.getComputedStyle = window.getComputedStyle.bind(window)
    else if (win[key] != null) globals[key] = win[key]
  }

  if (typeof globals.requestAnimationFrame !== 'function') {
    globals.requestAnimationFrame = (callback: FrameRequestCallback) =>
      window.setTimeout(callback, 0)
    globals.cancelAnimationFrame = (id: number) => window.clearTimeout(id)
  }

  stubObserver('IntersectionObserver', {
    observe() {},
    unobserve() {},
    disconnect() {},
    takeRecords() {
      return []
    }
  })
  stubObserver('ResizeObserver', {
    observe() {},
    unobserve() {},
    disconnect() {}
  })

  globals.IS_REACT_ACT_ENVIRONMENT = true
}

function ensureWindow() {
  if (typeof globalThis.window === 'undefined' || globalThis.window == null) applyDom()
}

applyDom()
afterEach(ensureWindow)
afterAll(ensureWindow)
