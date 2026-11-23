import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { loadCustomizationFixture } from '@test/instance-customization-fixture'

import { resetCustomization } from '@/shared/lib/instance-customization'

import { useRepaymentComposeState } from './use-repayment-compose-state'

beforeEach(() => {
  loadCustomizationFixture()
})

afterEach(() => {
  resetCustomization()
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
