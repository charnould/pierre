import { describe, expect, it } from 'bun:test'

import { buildBridgeScript, buildErrorHtml } from './in-app-browser'

type MockButton = {
  id: string
  textContent: string
  onclick: (() => void) | null
  style: Record<string, string>
}

function runBridgeScript(
  answer: string,
  { hasBody = true, hasTarget = true }: { hasBody?: boolean; hasTarget?: boolean } = {}
) {
  const target = { textContent: '' }
  let closeBtn: MockButton | null = null

  const document = {
    body: hasBody
      ? {
          appendChild(el: MockButton) {
            closeBtn = el
          }
        }
      : null,
    getElementById(id: string) {
      if (id === 'pierre-bridge-demo-answer' && hasTarget) return target
      return null
    },
    createElement(tag: string) {
      if (tag !== 'button') throw new Error(`unexpected tag: ${tag}`)
      return { id: '', textContent: '', onclick: null, style: {} } satisfies MockButton
    }
  }

  const prevDocument = globalThis.document
  const prevWindow = globalThis.window
  Object.defineProperty(globalThis, 'document', { value: document, configurable: true })
  Object.defineProperty(globalThis, 'window', { value: prevWindow, configurable: true })

  let result: boolean
  try {
    // oxlint-disable-next-line no-eval -- simulates injected bridge script in DOM context
    result = eval(buildBridgeScript(answer)) as boolean
  } finally {
    if (prevDocument === undefined) Reflect.deleteProperty(globalThis, 'document')
    else Object.defineProperty(globalThis, 'document', { value: prevDocument, configurable: true })
    if (prevWindow === undefined) Reflect.deleteProperty(globalThis, 'window')
    else Object.defineProperty(globalThis, 'window', { value: prevWindow, configurable: true })
  }

  return { result, target, closeBtn }
}

// ─── buildBridgeScript ────────────────────────────────────────────────────────

describe('buildBridgeScript', () => {
  it('embeds the answer safely via JSON.stringify', () => {
    for (const answer of [
      'Hello "world" & <you>',
      'Line 1\nLine 2\n"quoted"',
      'prix : `50 €` ${variable}'
    ]) {
      const script = buildBridgeScript(answer)
      expect(script).toContain(JSON.stringify(answer))
    }
  })

  it('returns false when document.body is missing', () => {
    const { result, closeBtn } = runBridgeScript('test', { hasBody: false })
    expect(result).toBe(false)
    expect(closeBtn).toBeNull()
  })

  it('appends a close button even when the target div is missing', () => {
    const { result, closeBtn } = runBridgeScript('test', { hasTarget: false })
    expect(result).toBe(false)
    expect(closeBtn?.id).toBe('__pierre_close__')
    expect(closeBtn?.textContent).toBe('\u2715  Fermer')
  })

  it('injects the answer and returns true when the target div exists', () => {
    const answer = 'my answer'
    const { result, target } = runBridgeScript(answer)
    expect(result).toBe(true)
    expect(target.textContent).toBe(answer)
  })

  it('injects a close button wired to window.close()', () => {
    const { closeBtn } = runBridgeScript('test')
    expect(closeBtn?.id).toBe('__pierre_close__')
    expect(closeBtn?.textContent).toBe('\u2715  Fermer')
    expect(typeof closeBtn?.onclick).toBe('function')
    expect(buildBridgeScript('test')).toContain('window.close()')
  })

  it('produces identical output for the same answer (pure function)', () => {
    const answer = 'deterministic'
    expect(buildBridgeScript(answer)).toBe(buildBridgeScript(answer))
  })
})

// ─── buildErrorHtml ──────────────────────────────────────────────────────────

describe('buildErrorHtml', () => {
  it('returns a valid HTML document', () => {
    const html = buildErrorHtml('http://localhost:57099/aravis-1')
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('</html>')
  })

  it('includes the URL in the output', () => {
    const url = 'http://localhost:57099/aravis-1'
    const html = buildErrorHtml(url)
    expect(html).toContain(url)
  })

  it('escapes HTML special characters in the URL', () => {
    const url = 'http://example.com?a=1&b=<2>'
    const html = buildErrorHtml(url)
    expect(html).toContain('&amp;')
    expect(html).toContain('&lt;')
    expect(html).toContain('&gt;')
    expect(html).not.toContain('<2>')
  })

  it('includes a close button calling window.close()', () => {
    const html = buildErrorHtml('http://localhost')
    expect(html).toContain('window.close()')
  })

  it('contains a user-friendly error message (French)', () => {
    const html = buildErrorHtml('http://localhost')
    expect(html.toLowerCase()).toContain('inaccessible')
  })

  it('produces identical output for the same URL (pure function)', () => {
    const url = 'http://localhost:57099'
    expect(buildErrorHtml(url)).toBe(buildErrorHtml(url))
  })
})
