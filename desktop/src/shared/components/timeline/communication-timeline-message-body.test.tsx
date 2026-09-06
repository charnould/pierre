import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

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
      'HTMLButtonElement',
      'Element',
      'Node',
      'Event'
    ]) {
      originalGlobals.set(key, globals[key])
    }
    globalThis.document = dom.window.document
    globalThis.window = dom.window as unknown as Window & typeof globalThis
    globalThis.HTMLElement = dom.window.HTMLElement
    globalThis.HTMLButtonElement = dom.window.HTMLButtonElement
    globalThis.Element = dom.window.Element
    globalThis.Node = dom.window.Node
    globalThis.Event = dom.window.Event
    installedDom = true
  }
})

afterAll(() => {
  if (!installedDom) return
  const globals = globalThis as Record<string, unknown>
  for (const [key, value] of originalGlobals) {
    if (value === undefined) delete globals[key]
    else globals[key] = value
  }
})

function activity(partial: Pick<Activite, 'type' | 'contenu'> & Partial<Activite>): Activite {
  return {
    id: 1,
    date_creation: '2026-06-10 10:00',
    rattachement: 'tickets:REC-1',
    auteur: 'tenant:Locataire',
    id_client: null,
    id_locataire: 'LOC-1',
    id_lot: 'LOT-1',
    statut: 'logged',
    mentions: [],
    ...partial
  }
}

async function renderBody(row: Activite) {
  const { act } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { AgentIdentityProvider } = await import('@/contexts/AgentIdentityContext')
  const { CommunicationTimelineMessageBody } = await import('./communication-timeline-message-body')
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(
      <AgentIdentityProvider name="Gustave">
        <CommunicationTimelineMessageBody row={row} />
      </AgentIdentityProvider>
    )
  })
  return {
    container,
    cleanup: async () => {
      await act(async () => {
        root.unmount()
      })
      container.remove()
    }
  }
}

describe('CommunicationTimelineMessageBody', () => {
  test('affiche objet et corps replié pour un courriel', async () => {
    const { container, cleanup } = await renderBody(
      activity({
        type: 'email',
        statut: 'sent',
        destinataire: 'bob@locataire.fr',
        contenu: JSON.stringify({
          version: 1,
          objet: 'Relance loyer',
          corps: 'Merci de régulariser.'
        })
      })
    )
    try {
      expect(container.textContent).toContain('Objet')
      expect(container.textContent).toContain('Relance loyer')
      expect(container.textContent).toContain('Corps du message')
      const panel = container.querySelector('[data-slot="collapsible-content"]')
      expect(panel?.getAttribute('hidden')).not.toBeNull()
    } finally {
      await cleanup()
    }
  })

  test('ouvre le corps pour la réception initiale d’une réclamation', async () => {
    const { container, cleanup } = await renderBody(
      activity({
        type: 'email',
        statut: 'received',
        contenu: JSON.stringify({
          version: 1,
          objet: 'Réclamation REC-1',
          corps: 'Fuite sous l’évier.',
          reception_initiale: true
        })
      })
    )
    try {
      expect(container.textContent).toContain('Réclamation REC-1')
      expect(container.textContent).toContain('Fuite sous l’évier.')
      const panel = container.querySelector('[data-slot="collapsible-content"]')
      expect(panel?.getAttribute('hidden')).toBeNull()
    } finally {
      await cleanup()
    }
  })

  test('affiche le corps d’un RCS et les choix proposés', async () => {
    const { container, cleanup } = await renderBody(
      activity({
        type: 'rcs',
        contenu: JSON.stringify({
          version: 1,
          corps: 'Pouvez-vous confirmer ?',
          choix: ['Oui', 'Non']
        })
      })
    )
    try {
      expect(container.textContent).toContain('Corps du RCS')
      expect(container.textContent).toContain('Pouvez-vous confirmer ?')
      expect(container.textContent).toContain('Choix proposés : Oui · Non')
    } finally {
      await cleanup()
    }
  })

  test('affiche De / À / Envoyé le pour un courriel importé', async () => {
    const { container, cleanup } = await renderBody(
      activity({
        type: 'email_import',
        contenu: JSON.stringify({
          version: 1,
          objet: 'Relance loyer',
          corps: 'Merci de régulariser.',
          expediteur: 'Alice <alice@bailleur.fr>',
          destinataire: 'Bob <bob@locataire.fr>',
          date_envoi: '2026-08-12T08:00:00Z'
        })
      })
    )
    try {
      expect(container.textContent).toContain('De Alice <alice@bailleur.fr>')
      expect(container.textContent).toContain('À Bob <bob@locataire.fr>')
      expect(container.textContent).toContain('Envoyé le')
      expect(container.textContent).not.toContain('vers')
    } finally {
      await cleanup()
    }
  })
})
