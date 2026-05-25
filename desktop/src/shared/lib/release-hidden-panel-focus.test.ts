import { beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import { isFocusInHiddenPanel } from './release-hidden-panel-focus'

beforeAll(() => {
  if (typeof globalThis.document === 'undefined') {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    globalThis.document = dom.window.document
    globalThis.window = dom.window as Window & typeof globalThis
    globalThis.HTMLElement = dom.window.HTMLElement
    globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
  }
})

describe('isFocusInHiddenPanel', () => {
  test('returns true for input inside hidden tab-panel', () => {
    const panel = document.createElement('div')
    panel.className = 'tab-panel hidden'
    const input = document.createElement('input')
    panel.append(input)
    document.body.append(panel)
    expect(isFocusInHiddenPanel(input)).toBe(true)
    panel.remove()
  })

  test('returns true when panel has pointer-events none', () => {
    const panel = document.createElement('div')
    panel.className = 'tab-panel'
    panel.style.pointerEvents = 'none'
    const textarea = document.createElement('textarea')
    panel.append(textarea)
    document.body.append(panel)
    expect(isFocusInHiddenPanel(textarea)).toBe(true)
    panel.remove()
  })

  test('returns false for visible panel', () => {
    const panel = document.createElement('div')
    panel.className = 'tab-panel'
    const input = document.createElement('input')
    panel.append(input)
    document.body.append(panel)
    expect(isFocusInHiddenPanel(input)).toBe(false)
    panel.remove()
  })

  test('returns false outside tab-panel', () => {
    const button = document.createElement('button')
    expect(isFocusInHiddenPanel(button)).toBe(false)
  })
})
