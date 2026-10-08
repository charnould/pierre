import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { type SortingState, useTable } from '@tanstack/react-table'
import { JSDOM } from 'jsdom'
import { useState } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import { BOARD_DATA_COLUMN_MIN_WIDTH, BoardDualTable } from './board-dual-table'
import { BoardTableDataRow } from './board-table-data-row'
import { type AnyPierreColumn, ColumnHeaderOptionsTrigger } from './column-header-options-menu'
import { DataColumnHeader } from './DataColumnHeader'
import { pierreTableFeatures } from './table-features'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const saved = {
  window: globalThis.window,
  document: globalThis.document,
  HTMLElement: globalThis.HTMLElement,
  Element: globalThis.Element,
  Node: globalThis.Node,
  ResizeObserver: globalThis.ResizeObserver,
  requestAnimationFrame: globalThis.requestAnimationFrame,
  cancelAnimationFrame: globalThis.cancelAnimationFrame,
  getComputedStyle: globalThis.getComputedStyle
}

beforeAll(() => {
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    getComputedStyle: dom.window.getComputedStyle,
    requestAnimationFrame: (callback: FrameRequestCallback) =>
      dom.window.setTimeout(() => callback(0), 0),
    cancelAnimationFrame: (id: number) => dom.window.clearTimeout(id),
    ResizeObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
    IS_REACT_ACT_ENVIRONMENT: true
  })
})

afterAll(() => {
  Object.assign(globalThis, saved)
})

function BoardHarness({
  onActivate,
  scrollRef
}: {
  onActivate: (name: string) => void
  scrollRef: { current: HTMLDivElement }
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const table = useTable({
    features: pierreTableFeatures,
    data: [{ id: '1', nom: 'Ada' }],
    columns: [
      {
        accessorKey: 'nom',
        header: ({ column }) => (
          <DataColumnHeader
            title="Nom"
            column={column as unknown as AnyPierreColumn}
            optionsMenu={
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger render={<ColumnHeaderOptionsTrigger columnLabel="Nom" />} />
                <DropdownMenuContent>
                  <DropdownMenuItem>Filtrer</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />
        ),
        size: 60
      }
    ],
    defaultColumn: { minSize: BOARD_DATA_COLUMN_MIN_WIDTH },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    state: { sorting }
  })
  const headerGroups = table.getHeaderGroups()

  return (
    <BoardDualTable
      headerGroups={headerGroups}
      leafHeaders={headerGroups[0]?.headers ?? []}
      rows={table.getRowModel().rows}
      scrollRef={scrollRef}
      emptyMessage="Vide"
      renderRow={(row, meta) => (
        <BoardTableDataRow
          key={row.id}
          row={row}
          index={meta.index}
          measureRef={meta.measureRef}
          selected={row.original.nom === 'Ada'}
          onActivate={(entry) => onActivate(entry.nom)}
        />
      )}
    />
  )
}

describe('BoardDualTable', () => {
  test('remplit la largeur disponible et garde l’en-tête mono', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const activated: string[] = []
    const scroller = document.createElement('div')
    Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 600 })
    Object.defineProperty(scroller, 'clientWidth', { configurable: true, value: 800 })
    const container = document.createElement('div')
    document.body.append(scroller, container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <BoardHarness
          scrollRef={{ current: scroller }}
          onActivate={(name) => activated.push(name)}
        />
      )
    })

    const tables = [...container.querySelectorAll('table')]
    expect(tables).toHaveLength(2)
    for (const table of tables) {
      expect(table.classList.contains('min-w-full')).toBe(true)
      expect(table.style.width).toBe(`${BOARD_DATA_COLUMN_MIN_WIDTH}px`)
    }
    const headScroller = container.querySelector<HTMLElement>('.sticky')
    expect(headScroller?.classList.contains('top-0')).toBe(true)
    expect(headScroller?.classList.contains('z-20')).toBe(true)
    expect(headScroller?.getAttribute('style') ?? '').not.toContain('board-table-section')
    const bodyScroller = container.querySelector<HTMLElement>('.relative.z-0')
    expect(bodyScroller).not.toBeNull()
    const head = container.querySelector<HTMLElement>('[data-slot="table-head"]')
    expect(head?.dataset.variant).toBe('board')
    expect(head?.classList.contains('font-mono')).toBe(true)
    expect(head?.textContent).toContain('Nom')
    expect(head?.classList.contains('overflow-hidden')).toBe(false)
    const controls = head?.querySelector<HTMLElement>('.z-20')
    expect(controls?.textContent).toBe('')

    const sortButton = container.querySelector<HTMLButtonElement>('[aria-label="Trier Nom"]')
    expect(sortButton).not.toBeNull()
    await act(async () => {
      sortButton?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    })
    expect(
      container.querySelector('[aria-label="Tri croissant de Nom. Passer au tri décroissant"]')
    ).not.toBeNull()
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Tri croissant de Nom. Passer au tri décroissant"]'
        )
        ?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    })
    expect(
      container.querySelector('[aria-label="Tri décroissant de Nom. Retirer le tri"]')
    ).not.toBeNull()
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Tri décroissant de Nom. Retirer le tri"]')
        ?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('[aria-label="Trier Nom"]')).not.toBeNull()

    const optionsButton = container.querySelector<HTMLButtonElement>('[aria-label="Options Nom"]')
    expect(optionsButton).not.toBeNull()
    await act(async () => {
      optionsButton?.dispatchEvent(
        new dom.window.MouseEvent('mousedown', { bubbles: true, button: 0 })
      )
      await new Promise((resolve) => dom.window.setTimeout(resolve, 50))
    })
    expect(optionsButton?.getAttribute('aria-expanded')).toBe('true')
    expect(document.querySelector('[data-slot="dropdown-menu-content"]')?.textContent).toContain(
      'Filtrer'
    )
    expect(activated).toEqual([])

    const cell = [...container.querySelectorAll<HTMLElement>('[data-slot="table-cell"]')].find(
      (element) => element.textContent?.includes('Ada')
    )
    expect(cell?.dataset.variant).toBe('board')
    expect(cell?.classList.contains('font-sans')).toBe(true)
    expect(cell?.textContent).toContain('Ada')

    const row = container.querySelector<HTMLTableRowElement>(
      '[data-slot="table-row"][tabindex="0"]'
    )
    expect(row?.getAttribute('aria-selected')).toBe('true')
    await act(async () => {
      row?.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(activated).toEqual(['Ada'])

    await act(async () => root.unmount())
    container.remove()
    scroller.remove()
  })
})
