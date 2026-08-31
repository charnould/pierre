import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import type { Activite } from '@/shared/types/activites'

import { useNotificationTimeline } from './use-notification-timeline'

let installedDom = false

beforeAll(() => {
  if (typeof globalThis.document === 'undefined') {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    globalThis.document = dom.window.document
    globalThis.window = dom.window as unknown as Window & typeof globalThis
    globalThis.HTMLElement = dom.window.HTMLElement
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
})

function activity(id: number): Activite {
  return {
    id,
    date_creation: '2026-08-17T10:00:00',
    rattachement: 'tickets:REC-1',
    auteur: 'user:alice@pierre.test',
    id_client: null,
    id_locataire: null,
    id_lot: null,
    type: 'note',
    statut: 'logged',
    mentions: [],
    contenu: 'hello'
  }
}

describe('useNotificationTimeline', () => {
  test('keeps previous rows when a later refresh returns null', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    let payload: { data: Activite[] } | null = { data: [activity(1)] }
    window.api = {
      getActivities: async () => payload
    } as unknown as typeof window.api

    const renders: ReturnType<typeof useNotificationTimeline>[] = []
    function Harness() {
      renders.push(useNotificationTimeline('https://pierre.test', 'tickets', 'REC-1'))
      return null
    }
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(<Harness />)
    })
    expect(renders.at(-1)!.rows).toEqual([activity(1)])

    payload = null
    await act(async () => {
      await renders.at(-1)!.refresh()
    })
    expect(renders.at(-1)!.rows).toEqual([activity(1)])

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
