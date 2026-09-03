import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import type { ActiviteListItem, GetActivitiesParams } from '@/shared/types/activites'

import { useHomeOpenActions } from './use-home-open-actions'

let installedDom = false

beforeAll(() => {
  if (typeof globalThis.document === 'undefined') {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    globalThis.document = dom.window.document
    globalThis.window = dom.window as unknown as Window & typeof globalThis
    globalThis.HTMLElement = dom.window.HTMLElement
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
  delete globals.getComputedStyle
})

function openTaskRow(id: number, title: string): ActiviteListItem {
  return {
    id,
    date_creation: '2026-09-17T08:00:00.000Z',
    rattachement: 'repayment:LOC-1',
    auteur: 'user:alice@exemple.fr',
    id_client: null,
    id_locataire: 'LOC-1',
    id_lot: null,
    type: 'task.created',
    channel: null,
    mentions: [],
    contenu: JSON.stringify({
      version: 2,
      task: {
        title,
        state: 'open',
        assignee: { id: 'user:alice@exemple.fr', label: 'Alice' },
        due_date: '2026-09-18'
      }
    }),
    thread_id: `thread-${id}`,
    revision: 1,
    my: null,
    read: false,
    reaction: null
  }
}

type ActionsApi = ReturnType<typeof useHomeOpenActions>

async function renderActions(mineRows: ActiviteListItem[], delegatedRows: ActiviteListItem[]) {
  const { act } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const requests: GetActivitiesParams[] = []

  window.api = {
    getActivities: async (params: GetActivitiesParams) => {
      requests.push(params)
      const source = params.assignee === 'me' ? mineRows : delegatedRows
      const offset = params.offset ?? 0
      const limit = params.limit ?? source.length
      return { data: source.slice(offset, offset + limit) }
    }
  } as unknown as typeof window.api

  const renders: ActionsApi[] = []

  function Harness() {
    renders.push(
      useHomeOpenActions({
        url: 'https://pierre.test',
        enabled: true,
        mineLimit: 5,
        delegatedLimit: 5
      })
    )
    return null
  }

  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(<Harness />)
  })
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })

  return {
    requests,
    last: () => renders[renders.length - 1]!,
    act,
    cleanup: async () => {
      await act(async () => {
        root.unmount()
      })
      container.remove()
    }
  }
}

describe('useHomeOpenActions', () => {
  test('fetches the first page with the home excerpt limits', async () => {
    const mineRows = Array.from({ length: 8 }, (_, index) =>
      openTaskRow(index + 1, `Mine ${index + 1}`)
    )
    const delegatedRows = Array.from({ length: 3 }, (_, index) =>
      openTaskRow(index + 100, `Delegated ${index + 1}`)
    )
    const harness = await renderActions(mineRows, delegatedRows)
    try {
      expect(harness.last().mine.map((action) => action.contenu.task.title)).toEqual([
        'Mine 1',
        'Mine 2',
        'Mine 3',
        'Mine 4',
        'Mine 5'
      ])
      expect(harness.last().delegated).toHaveLength(3)
      expect(harness.last().hasMoreMine).toBe(true)
      expect(harness.last().hasMoreDelegated).toBe(false)
      expect(harness.requests.filter((request) => request.assignee === 'me')).toEqual([
        expect.objectContaining({ limit: 5, offset: 0, assignee: 'me' })
      ])
    } finally {
      await harness.cleanup()
    }
  })

  test('load more appends the next page', async () => {
    const mineRows = Array.from({ length: 8 }, (_, index) =>
      openTaskRow(index + 1, `Mine ${index + 1}`)
    )
    const harness = await renderActions(mineRows, [])
    try {
      await harness.act(async () => {
        await harness.last().loadMoreMine()
      })
      expect(harness.last().mine).toHaveLength(8)
      expect(harness.last().hasMoreMine).toBe(false)
      expect(harness.requests.filter((request) => request.assignee === 'me').at(-1)).toEqual(
        expect.objectContaining({ limit: 5, offset: 5, assignee: 'me' })
      )
    } finally {
      await harness.cleanup()
    }
  })
})
