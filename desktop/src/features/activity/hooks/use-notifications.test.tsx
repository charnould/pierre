import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import type { ActiviteListItem, GetActivitiesParams } from '@/shared/types/activites'

import { useNotifications } from './use-notifications'

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
  // `act` refuses to flush updates unless the environment opts in.
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

// Other suites in this process assert on `document` being absent, so put the
// globals back the way they were.
afterAll(() => {
  if (!installedDom) return
  const globals = globalThis as Record<string, unknown>
  delete globals.document
  delete globals.window
  delete globals.HTMLElement
  delete globals.getComputedStyle
})

function activityRow(id: number): ActiviteListItem {
  return {
    id,
    date_creation: '2026-07-26T10:00:00.000Z',
    rattachement: 'tickets:REC-1',
    auteur: 'agent:alice',
    id_client: null,
    id_locataire: null,
    id_lot: null,
    type: 'note',
    statut: 'logged',
    mentions: [{ destinataire: 'user:alice@pierre.test', lu: false, boost: null }],
    contenu: 'coucou',
    my: { destinataire: 'user:alice@pierre.test', lu: false, boost: null }
  }
}

type NotificationsApi = ReturnType<typeof useNotifications>

/**
 * Renders `useNotifications` and records the object it returns on every render,
 * so a test can compare references across renders.
 */
async function renderNotifications(rows: ActiviteListItem[], unreadOnly = false) {
  const { act } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const requests: GetActivitiesParams[] = []

  window.api = {
    getActivities: async (params: GetActivitiesParams) => {
      requests.push(params)
      const offset = params.offset ?? 0
      const limit = params.limit ?? rows.length
      return { data: rows.slice(offset, offset + limit) }
    }
  } as unknown as typeof window.api

  const renders: NotificationsApi[] = []

  function Harness() {
    renders.push(useNotifications('https://pierre.test', 'alice@pierre.test', true, unreadOnly))
    return null
  }

  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)

  const render = async () => {
    await act(async () => {
      root.render(<Harness />)
    })
  }

  await render()

  return {
    renders,
    requests,
    render,
    last: () => renders[renders.length - 1]!,
    cleanup: async () => {
      await act(async () => {
        root.unmount()
      })
      container.remove()
    }
  }
}

describe('useNotifications referential identity', () => {
  test('returns the same object across a re-render with unchanged inputs', async () => {
    const harness = await renderNotifications([activityRow(1)])

    const before = harness.last()
    const rendersBefore = harness.renders.length

    await harness.render()

    // The re-render really happened...
    expect(harness.renders.length).toBeGreaterThan(rendersBefore)
    // ...and it handed back the very same object.
    expect(harness.last()).toBe(before)

    await harness.cleanup()
  })

  test('returns a new object when the underlying rows change', async () => {
    const harness = await renderNotifications([activityRow(1)])

    const before = harness.last()
    expect(before.rows).toHaveLength(1)

    window.api = {
      getActivities: async () => ({ data: [activityRow(1), activityRow(2)] })
    } as unknown as typeof window.api

    const { act } = await import('react')
    await act(async () => {
      await before.refresh()
    })

    expect(harness.last()).not.toBe(before)
    expect(harness.last().rows).toHaveLength(2)
    expect(harness.last().unreadCount).toBe(2)

    await harness.cleanup()
  })
})

describe('useNotifications inbox paging', () => {
  test('sends unread_only and the first page of 50', async () => {
    const harness = await renderNotifications([activityRow(1)], true)

    expect(harness.requests[0]).toEqual({
      url: 'https://pierre.test',
      inbox: true,
      unread_only: true,
      limit: 50,
      offset: 0
    })

    await harness.cleanup()
  })
})

describe('useNotifications markAllRead', () => {
  test('patches every unread row then refreshes the inbox once', async () => {
    const harness = await renderNotifications([activityRow(1), activityRow(2)])
    const patchActivity = mock(async ({ id }: { id: number }) => ({ data: activityRow(id) }))
    const getActivities = mock(async () => ({ data: [activityRow(1), activityRow(2)] }))
    window.api = { getActivities, patchActivity } as unknown as typeof window.api

    const { act } = await import('react')
    await act(async () => {
      await harness.last().markAllRead()
    })

    expect(patchActivity).toHaveBeenCalledTimes(2)
    expect(getActivities).toHaveBeenCalledTimes(1)

    await harness.cleanup()
  })
})

describe('useNotifications toggleBoost', () => {
  test('patches set_boost even without an existing mention row match', async () => {
    const harness = await renderNotifications([activityRow(1)])
    const patchActivity = mock(async () => ({ data: activityRow(1) }))
    window.api = {
      getActivities: async () => ({ data: [activityRow(1)] }),
      patchActivity
    } as unknown as typeof window.api

    const { act } = await import('react')
    await act(async () => {
      await harness.last().toggleBoost(1, '👍')
    })

    expect(patchActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        patch: { operation: 'set_boost', emoji: '👍' }
      })
    )

    await harness.cleanup()
  })
})
