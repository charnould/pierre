import { describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import type { AnyPierreColumn, AnyPierreHeader } from './column-header-options-menu'
import { ColumnResizeHandle } from './column-resize-handle'
import { cycleColumnSort, DataColumnHeader } from './DataColumnHeader'

describe('column interactions', () => {
  test('le tri direct passe de aucun à croissant, décroissant, puis aucun', () => {
    const calls: string[] = []
    const column = {
      sorted: false as false | 'asc' | 'desc',
      getIsSorted() {
        return this.sorted
      },
      toggleSorting(desc?: boolean) {
        this.sorted = desc ? 'desc' : 'asc'
        calls.push(this.sorted)
      },
      clearSorting() {
        this.sorted = false
        calls.push('none')
      }
    }

    cycleColumnSort(column)
    cycleColumnSort(column)
    cycleColumnSort(column)
    expect(calls).toEqual(['asc', 'desc', 'none'])
  })

  test('le bouton de tri est distinct du menu de filtre', () => {
    const markup = renderToStaticMarkup(
      <DataColumnHeader
        title="Dette"
        column={
          {
            getCanSort: () => true,
            getIsSorted: () => false,
            toggleSorting: () => {},
            clearSorting: () => {}
          } as AnyPierreColumn
        }
        optionsMenu={<span>Filtrer</span>}
      />
    )

    expect(markup).toContain('Trier Dette')
    expect(markup).toContain('Filtrer')
    expect(markup).toContain('z-20')
  })

  test('la poignée de redimensionnement reste visible', () => {
    const markup = renderToStaticMarkup(
      <ColumnResizeHandle
        header={
          {
            column: {
              getCanResize: () => true,
              getIsResizing: () => false
            },
            getResizeHandler: () => () => {}
          } as unknown as AnyPierreHeader
        }
      />
    )

    expect(markup).toContain('Redimensionner la colonne')
    expect(markup).toContain('before:bg-border')
  })
})
