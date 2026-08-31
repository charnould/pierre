import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import type { Activite } from '@/shared/types/activites'

let installedDom = false
const originalGlobals = new Map<string, unknown>()

beforeAll(() => {
  const globals = globalThis as Record<string, unknown>
  const existingWindow = globals.window as { setTimeout?: unknown; Element?: unknown } | undefined
  const hasWorkingDom =
    typeof globals.document !== 'undefined' &&
    typeof existingWindow?.setTimeout === 'function' &&
    typeof globals.Element === 'function'

  if (!hasWorkingDom) {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    for (const key of [
      'document',
      'window',
      'HTMLElement',
      'Element',
      'Node',
      'Event',
      'MouseEvent',
      'MutationObserver',
      'getComputedStyle',
      'requestAnimationFrame',
      'cancelAnimationFrame'
    ]) {
      originalGlobals.set(key, globals[key])
    }

    globalThis.document = dom.window.document
    globalThis.window = dom.window as unknown as Window & typeof globalThis
    globalThis.HTMLElement = dom.window.HTMLElement
    globalThis.Element = dom.window.Element
    globalThis.Node = dom.window.Node
    globalThis.Event = dom.window.Event
    globalThis.MouseEvent = dom.window.MouseEvent
    globalThis.MutationObserver = dom.window.MutationObserver
    globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
    globalThis.requestAnimationFrame = (callback) => window.setTimeout(callback, 0)
    globalThis.cancelAnimationFrame = (id) => window.clearTimeout(id)
    installedDom = true
  }
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterAll(() => {
  if (!installedDom) return
  const globals = globalThis as Record<string, unknown>
  for (const [key, value] of originalGlobals) {
    if (value === undefined) delete globals[key]
    else globals[key] = value
  }
})

function sampleActivity(overrides: Partial<Activite> = {}): Activite {
  return {
    id: 7,
    date_creation: '2026-08-17T10:00:00',
    rattachement: 'repayment:LOC-1',
    auteur: 'user:bob@exemple.fr',
    id_client: 'CLI-1',
    id_locataire: 'LOC-1',
    id_lot: null,
    type: 'note',
    statut: 'logged',
    mentions: [],
    contenu: 'Relance',
    ...overrides
  }
}

async function renderControl(activity: Activite, currentUser: string) {
  const { act } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { ActivityBoostControl } = await import('./ActivityBoostControl')
  const onBoost = mock((_emoji: string | null) => {})

  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(
      <ActivityBoostControl activity={activity} currentUser={currentUser} onBoost={onBoost} />
    )
  })

  return {
    onBoost,
    cleanup: async () => {
      await act(async () => {
        root.unmount()
      })
      container.remove()
    }
  }
}

describe('ActivityBoostControl', () => {
  test('renders nothing on the current user’s own activity', async () => {
    const { cleanup } = await renderControl(sampleActivity(), 'bob@exemple.fr')
    try {
      expect(document.querySelector('[aria-label="Booster"]')).toBeNull()
      expect(document.body.textContent).not.toContain('Boost')
    } finally {
      await cleanup()
    }
  })

  test('shows a boost trigger on another collaborator’s activity', async () => {
    const { cleanup } = await renderControl(sampleActivity(), 'alice@exemple.fr')
    try {
      expect(document.querySelector('[aria-label="Booster"]')).not.toBeNull()
    } finally {
      await cleanup()
    }
  })

  test('shows a boost trigger on a colleague’s bulk courrier', async () => {
    const { cleanup } = await renderControl(
      sampleActivity({ type: 'courrier', bulk_id: 'bulk-r1' }),
      'alice@exemple.fr'
    )
    try {
      expect(document.querySelector('[aria-label="Booster"]')).not.toBeNull()
    } finally {
      await cleanup()
    }
  })

  test('opens large emoji cells and removes the current boost', async () => {
    const { act } = await import('react')
    const { cleanup, onBoost } = await renderControl(
      sampleActivity({
        mentions: [{ destinataire: 'user:alice@exemple.fr', lu: true, boost: '👍', inbox: false }]
      }),
      'alice@exemple.fr'
    )
    try {
      const trigger = [...document.querySelectorAll('button')].find(
        (button) => button.getAttribute('aria-label') === 'Modifier le boost 👍'
      )
      expect(trigger).toBeTruthy()

      await act(async () => {
        trigger?.click()
        await new Promise((resolve) => window.setTimeout(resolve, 50))
      })

      const cells = [...document.querySelectorAll('button')].filter((button) =>
        button.getAttribute('aria-label')?.startsWith('Boost ')
      )
      expect(cells.length).toBeGreaterThan(0)
      expect(cells[0]?.className).toContain('size-9')
      expect(cells[0]?.className).toContain('text-xl')

      const remove = [...document.querySelectorAll('button')].find(
        (button) => button.textContent === 'Retirer le boost'
      )
      expect(remove).toBeTruthy()

      await act(async () => {
        remove?.click()
        await new Promise((resolve) => window.setTimeout(resolve, 50))
      })

      expect(onBoost).toHaveBeenCalledWith(null)
    } finally {
      await cleanup()
    }
  })

  test('shows received boosts on the author’s own activity without a picker', async () => {
    const { cleanup } = await renderControl(
      sampleActivity({
        auteur: 'user:alice@exemple.fr',
        mentions: [{ destinataire: 'user:bob@exemple.fr', lu: true, boost: '🔥', inbox: false }]
      }),
      'alice@exemple.fr'
    )
    try {
      expect(document.querySelector('[aria-label="Booster"]')).toBeNull()
      expect(document.querySelector('[aria-label="Boosts"]')?.textContent).toContain('🔥')
    } finally {
      await cleanup()
    }
  })
})
