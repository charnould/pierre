import { describe, expect, test } from 'bun:test'

import { useState } from 'react'

import { BoardSelectionCell, BoardSelectionProvider } from './board-selection'

function Harness() {
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(() => new Set())
  return (
    <BoardSelectionProvider
      value={{
        checkedIds,
        disabled: false,
        onCheckedChange: (id, checked) => {
          setCheckedIds((current) => {
            const next = new Set(current)
            if (checked) next.add(id)
            else next.delete(id)
            return next
          })
        }
      }}
    >
      <BoardSelectionCell id="LOC-1" label="Sélectionner LOC-1" />
    </BoardSelectionProvider>
  )
}

describe('BoardSelectionCell', () => {
  test('coche la case depuis la sélection courante', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<Harness />)
    })

    const checkbox = container.querySelector<HTMLElement>('[data-slot="checkbox"]')
    expect(checkbox?.getAttribute('aria-checked')).not.toBe('true')
    await act(async () => {
      checkbox?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('[data-slot="checkbox"]')?.getAttribute('aria-checked')).toBe(
      'true'
    )

    await act(async () => root.unmount())
    container.remove()
  })
})
