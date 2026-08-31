import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import { useRepaymentComposeState } from './use-repayment-compose-state'

let installedDom = false

beforeAll(() => {
  const globals = globalThis as Record<string, unknown>
  const existingWindow = globals.window as { setTimeout?: unknown } | undefined
  const hasWorkingDom =
    typeof globals.document !== 'undefined' && typeof existingWindow?.setTimeout === 'function'

  if (!hasWorkingDom) {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    globalThis.document = dom.window.document
    globalThis.window = dom.window as unknown as Window & typeof globalThis
    globalThis.HTMLElement = dom.window.HTMLElement
    globalThis.Element = dom.window.Element
    globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
    installedDom = true
  }
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterAll(() => {
  if (!installedDom) return
  const globals = globalThis as Record<string, unknown>
  delete globals.document
  delete globals.window
  delete globals.HTMLElement
  delete globals.Element
  delete globals.getComputedStyle
})

describe('useRepaymentComposeState', () => {
  test('le repos n’ouvre aucun brouillon', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')

    const renders: ReturnType<typeof useRepaymentComposeState>[] = []
    function Harness() {
      renders.push(useRepaymentComposeState({ bucket: null, action: null }))
      return null
    }

    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(<Harness />)
    })

    expect(renders.at(-1)?.mode).toBe(null)
    expect(renders.at(-1)?.epoch).toBe(0)

    await act(async () => {
      renders.at(-1)?.startNote('bonjour')
    })
    expect(renders.at(-1)?.mode).toBe('note')
    expect(renders.at(-1)?.comment).toBe('bonjour')
    expect(renders.at(-1)?.editingNoteId).toBeNull()
    expect(renders.at(-1)?.epoch).toBe(0)

    await act(async () => {
      renders.at(-1)?.startEditNote(42, 'Ancien texte')
    })
    expect(renders.at(-1)?.mode).toBe('edit_note')
    expect(renders.at(-1)?.editingNoteId).toBe(42)
    expect(renders.at(-1)?.comment).toBe('Ancien texte')
    expect(renders.at(-1)?.epoch).toBe(1)

    await act(async () => {
      renders.at(-1)?.startNote()
    })
    expect(renders.at(-1)?.mode).toBe('note')
    expect(renders.at(-1)?.editingNoteId).toBeNull()

    await act(async () => {
      renders.at(-1)?.reset()
    })
    expect(renders.at(-1)?.mode).toBe(null)
    expect(renders.at(-1)?.epoch).toBe(2)

    await act(async () => {
      renders.at(-1)?.startTodo()
    })
    expect(renders.at(-1)?.mode).toBe('todo')

    await act(async () => {
      renders.at(-1)?.startAction()
    })
    expect(renders.at(-1)?.mode).toBe('action')

    await act(async () => {
      renders.at(-1)?.startRcs()
    })
    expect(renders.at(-1)?.mode).toBe('rcs')

    await act(async () => {
      renders.at(-1)?.startEmail()
    })
    expect(renders.at(-1)?.mode).toBe('email')

    await act(async () => {
      renders.at(-1)?.startTags()
    })
    expect(renders.at(-1)?.mode).toBe('tags')

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
