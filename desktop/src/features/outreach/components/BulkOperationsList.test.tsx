import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import { BulkOperationsList } from '@/features/outreach/components/BulkOperationsList'
import {
  emptyBulkOperationDefinition,
  type BulkOperationRecord
} from '@/shared/types/bulk-operations'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const DOM_KEYS = [
  'window',
  'document',
  'HTMLElement',
  'Element',
  'Node',
  'Event',
  'MouseEvent',
  'MutationObserver'
] as const
const savedGlobals = new Map<string, unknown>()

beforeAll(() => {
  const globals = globalThis as Record<string, unknown>
  const win = dom.window as unknown as Record<string, unknown>
  for (const key of DOM_KEYS) {
    savedGlobals.set(key, globals[key])
    globals[key] = key === 'document' ? dom.window.document : win[key]
  }
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  window.api = {
    getUsers: async () => ({ data: [] })
  } as unknown as typeof window.api
})

afterAll(() => {
  const globals = globalThis as Record<string, unknown>
  for (const [key, value] of savedGlobals) {
    if (value === undefined) delete globals[key]
    else globals[key] = value
  }
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
        ;(container.querySelector('li[role="button"]') as HTMLElement).click()
      })
      expect(selected).toBe(1)
    } finally {
      await act(async () => root.unmount())
      container.remove()
    }
  })
})
