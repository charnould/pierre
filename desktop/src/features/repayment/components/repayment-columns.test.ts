import { describe, expect, test } from 'bun:test'

import { buildRepaymentColumns } from './repayment-columns'

describe('buildRepaymentColumns', () => {
  test('garde les colonnes système étroites et non redimensionnables', () => {
    const columns = buildRepaymentColumns({
      allRows: [],
      activeColumnIds: ['selection', 'alertes', 'id_locataire'],
      getRowSignal: () => null
    })
    const selection = columns.find((column) => column.id === 'selection')
    const alerts = columns.find((column) => column.id === 'alertes')

    expect(selection?.enableResizing).toBe(false)
    expect(selection?.minSize).toBe(40)
    expect(selection?.maxSize).toBe(40)
    expect(alerts?.enableSorting).toBe(true)
    expect(alerts?.enableResizing).toBe(false)
    expect(alerts?.minSize).toBe(40)
    expect(alerts?.maxSize).toBe(40)
  })
})
