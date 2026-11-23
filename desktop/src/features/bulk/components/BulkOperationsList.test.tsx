import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { BulkOperationsList } from '@/features/bulk/components/BulkOperationsList'
import {
  type BulkOperationRecord,
  emptyBulkOperationDefinition
} from '@/shared/types/bulk-operations'

let previousApi: typeof window.api

beforeEach(() => {
  previousApi = window.api
  window.api = {
    getUsers: async () => ({ data: [] })
  } as unknown as typeof window.api
})

afterEach(() => {
  window.api = previousApi
})

describe('navigation depuis la liste des traitements', () => {
  test('Historique ouvre les rapports sans ouvrir l’éditeur', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const operation: BulkOperationRecord = {
      id: 'bulk-1',
      name: 'Relance',
      description: 'Relance des impayés',
      definition: emptyBulkOperationDefinition(),
      reportsToKeep: 10,
      edits: [],
      lastRunAt: null
    }
    let selected = 0
    let openedReports = 0
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    try {
      await act(async () => {
        root.render(
          <BulkOperationsList
            url="https://example.test"
            bulkOperations={[operation]}
            query=""
            normalizedQuery=""
            onQueryChange={() => {}}
            sortKey="modified_desc"
            onSortKeyChange={() => {}}
            onSelect={() => {
              selected += 1
            }}
            onOpenReports={() => {
              openedReports += 1
            }}
            onNew={() => {}}
          />
        )
      })

      const history = [...container.querySelectorAll('button')].find(
        (button) => button.textContent === 'Historique'
      )
      await act(async () => history?.click())
      expect(openedReports).toBe(1)
      expect(selected).toBe(0)

      await act(async () => {
        const row = container.querySelector('li')
        const opener = row?.querySelector('[role="button"]')
        expect(row?.getAttribute('role')).toBeNull()
        expect(opener?.contains(history ?? null)).toBe(false)
        row?.click()
      })
      expect(selected).toBe(1)
    } finally {
      await act(async () => root.unmount())
      container.remove()
    }
  })
})
