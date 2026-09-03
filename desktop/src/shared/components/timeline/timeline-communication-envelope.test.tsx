import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'
import type { ReactNode } from 'react'

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
      'Event',
      'KeyboardEvent',
      'MouseEvent'
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
    globalThis.KeyboardEvent = dom.window.KeyboardEvent
    globalThis.MouseEvent = dom.window.MouseEvent
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
    date_creation: '2026-06-10T10:00:00Z',
    rattachement: 'tickets:REC-1',
    auteur: 'user:alice@exemple.fr',
    id_client: null,
    id_locataire: 'LOC-1',
    id_lot: 'LOT-1',
    channel: 'email',
    mentions: [],
    destinataire: 'bob@locataire.fr',
    ...partial
  }
}

async function renderEnvelope(
  row: Activite,
  expandable = true,
  wrap?: (node: ReactNode) => ReactNode,
  statuses: Activite[] = []
) {
  const { act } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { AgentIdentityProvider } = await import('@/contexts/AgentIdentityContext')
  const { TimelineCommunicationEnvelope } = await import('./timeline-communication-envelope')
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const tree = (
    <AgentIdentityProvider name="Gustave">
      <TimelineCommunicationEnvelope row={row} statuses={statuses} expandable={expandable} />
    </AgentIdentityProvider>
  )
  await act(async () => {
    root.render(wrap ? wrap(tree) : tree)
  })
  return {
    container,
    act,
    cleanup: async () => {
      await act(async () => {
        root.unmount()
      })
      container.remove()
    }
  }
}

describe('TimelineCommunicationEnvelope', () => {
  test('ordonne routage, objet, corps et statut pour un courriel court', async () => {
    const { container, cleanup } = await renderEnvelope(
      activity({
        type: 'communication.sent',
        contenu: JSON.stringify({
          version: 2,
          sender: 'alice@exemple.fr',
          subject: 'Relance loyer',
          body: 'Merci de régulariser.'
        })
      }),
      true,
      undefined,
      [
        activity({
          type: 'communication.ok',
          contenu: JSON.stringify({ version: 2, result: 'delivered' })
        })
      ]
    )
    try {
      const text = container.textContent ?? ''
      expect([...container.querySelectorAll('dt')].map((node) => node.textContent)).toEqual([
        'De',
        'À',
        'Objet',
        'Statut',
        'Corps'
      ])
      expect(text).toContain('alice@exemple.fr')
      expect(text).toContain('bob@locataire.fr')
      expect(text).toContain('Relance loyer')
      expect(text).toContain('Merci de régulariser.')
      expect(text).not.toContain('état au')
      expect(container.querySelectorAll('dl')).toHaveLength(1)
      expect(container.querySelector('dl')?.className).toContain(
        'grid-cols-[max-content_minmax(0,1fr)]'
      )
      const subject = [...container.querySelectorAll('dd')][2]
      expect(subject?.textContent).toBe('Relance loyer')
      expect(subject?.className).toContain('truncate')
      expect(container.querySelectorAll('dt svg')).toHaveLength(5)
      expect(container.querySelector('button')).toBeNull()
    } finally {
      await cleanup()
    }
  })

  test('enveloppe une adresse longue sans la masquer', async () => {
    const long = 'service-logement-allocations-familiales.contact-tres-long@caf.example.fr'
    const { container, cleanup } = await renderEnvelope(
      activity({
        type: 'communication.sent',
        destinataire: long,
        contenu: JSON.stringify({
          version: 2,
          sender: 'alice@exemple.fr',
          subject: 'APL',
          body: 'Bonjour'
        })
      })
    )
    try {
      const to = [...container.querySelectorAll('dd')][1]
      expect(to?.textContent).toBe(long)
      expect(to?.className).toContain('break-words')
      expect(container.textContent).not.toContain('•••')
    } finally {
      await cleanup()
    }
  })

  test('déplie et réduit un corps long dans l’Inspector, pas dans Activity', async () => {
    const long = activity({
      type: 'communication.sent',
      channel: 'sms',
      contenu: JSON.stringify({
        version: 2,
        sender: 'alice@exemple.fr',
        body: `${'bonjour '.repeat(40)}fin`
      })
    })
    const inspector = await renderEnvelope(long, true)
    try {
      expect(inspector.container.textContent).not.toContain('Afficher la suite')
      expect(inspector.container.textContent).not.toContain('fin')
      const toggle = inspector.container.querySelector('button')
      expect(toggle?.getAttribute('aria-label')).toBe('Afficher la suite')
      expect(toggle?.getAttribute('aria-expanded')).toBe('false')
      expect(toggle?.getAttribute('aria-controls')).toBeTruthy()
      await inspector.act(async () => {
        toggle?.click()
      })
      expect(inspector.container.textContent).toContain('fin')
      expect(toggle?.getAttribute('aria-label')).toBe('Réduire')
      expect(toggle?.getAttribute('aria-expanded')).toBe('true')
    } finally {
      await inspector.cleanup()
    }

    const preview = await renderEnvelope(long, false)
    try {
      expect(preview.container.textContent).toContain('…')
      expect(preview.container.querySelector('button')).toBeNull()
      expect(preview.container.textContent).not.toContain('fin')
    } finally {
      await preview.cleanup()
    }
  })

  test('le chevron déplie sans activer un parent', async () => {
    const long = activity({
      type: 'communication.sent',
      channel: 'sms',
      contenu: JSON.stringify({
        version: 2,
        sender: 'alice@exemple.fr',
        body: `${'bonjour '.repeat(40)}fin`
      })
    })
    let parentClicks = 0
    let parentKeys = 0
    const { createElement } = await import('react')
    const { container, act, cleanup } = await renderEnvelope(long, true, (node) =>
      createElement(
        'div',
        {
          role: 'button',
          tabIndex: 0,
          onClick: () => {
            parentClicks += 1
          },
          onKeyDown: () => {
            parentKeys += 1
          }
        },
        node
      )
    )
    try {
      const toggle = container.querySelector<HTMLButtonElement>(
        'button[aria-label="Afficher la suite"]'
      )
      expect(toggle).not.toBeNull()
      await act(async () => {
        toggle?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
        toggle?.click()
      })
      expect(parentClicks).toBe(0)
      expect(parentKeys).toBe(0)
      expect(toggle?.getAttribute('aria-expanded')).toBe('true')
      expect(container.textContent).toContain('fin')
    } finally {
      await cleanup()
    }
  })

  test('affiche les choix RCS et un import sans contrôle', async () => {
    const rcs = await renderEnvelope(
      activity({
        type: 'communication.sent',
        channel: 'rcs',
        contenu: JSON.stringify({
          version: 2,
          sender: 'alice@exemple.fr',
          body: 'Pouvez-vous confirmer ?',
          choices: [
            { type: 'reply', label: 'Oui' },
            { type: 'reply', label: 'Non' }
          ]
        })
      })
    )
    try {
      expect(rcs.container.textContent).toContain('Pouvez-vous confirmer ?')
      const labels = [...rcs.container.querySelectorAll('.sr-only')].map((node) => node.textContent)
      expect(labels).toContain('Corps')
      expect(labels).toContain('Choix proposés')
      const items = [...rcs.container.querySelectorAll('li')].map((item) => item.textContent)
      expect(items).toEqual(['Oui', 'Non'])
      expect(rcs.container.querySelectorAll('[data-slot="badge"]')).toHaveLength(2)
      expect(rcs.container.querySelector('ul')?.className).toContain('list-none')
      expect(rcs.container.textContent).not.toContain('Choix proposés : Oui · Non')
    } finally {
      await rcs.cleanup()
    }

    const imported = await renderEnvelope(
      activity({
        type: 'communication.imported',
        contenu: JSON.stringify({
          version: 2,
          sender: 'Alice <alice@bailleur.fr>',
          subject: 'Relance loyer',
          body: 'Merci de régulariser.'
        }),
        destinataire: 'Bob <bob@locataire.fr>',
        date_creation: '2026-08-12T08:00:00Z'
      })
    )
    try {
      expect(
        [...imported.container.querySelectorAll('dt')].map((node) => node.textContent)
      ).toEqual(['De', 'Objet', 'Corps'])
      expect(imported.container.textContent).toContain('Alice <alice@bailleur.fr>')
      expect(imported.container.textContent).not.toContain('Bob <bob@locataire.fr>')
      expect(imported.container.textContent).not.toContain('vers')
    } finally {
      await imported.cleanup()
    }
  })

  test('empile les paragraphes sans ligne vide', async () => {
    const { container, cleanup } = await renderEnvelope(
      activity({
        type: 'communication.sent',
        contenu: JSON.stringify({
          version: 2,
          sender: 'alice@exemple.fr',
          subject: 'Visite',
          body: 'Bonjour,\n\nJe vous fais suite.\n\nLe couple était présent.'
        })
      })
    )
    try {
      const body = [...container.querySelectorAll('dd')].find((node) =>
        node.className.includes('flex-col')
      )
      const blocks = body?.querySelectorAll('p') ?? []
      expect([...blocks].map((node) => node.textContent)).toEqual([
        'Bonjour,',
        'Je vous fais suite.',
        'Le couple était présent.'
      ])
      expect(body?.className).toContain('gap-1')
    } finally {
      await cleanup()
    }
  })

  test('n’affiche pas une ligne Objet déjà portée par la méta', async () => {
    const { container, cleanup } = await renderEnvelope(
      activity({
        type: 'communication.sent',
        contenu: JSON.stringify({
          version: 2,
          sender: 'alice@exemple.fr',
          subject: 'Dossier APL',
          body: 'Objet :\n\nMadame, Monsieur,\nEn réponse à votre demande.'
        })
      }),
      true,
      undefined,
      [
        activity({
          type: 'communication.ok',
          contenu: JSON.stringify({ version: 2, result: 'delivered' })
        })
      ]
    )
    try {
      const body = [...container.querySelectorAll('dd')].find((node) =>
        node.textContent?.includes('Madame, Monsieur,')
      )
      expect(body?.textContent).toContain('Madame, Monsieur,')
      expect(body?.textContent).not.toMatch(/^Objet/)
      expect([...container.querySelectorAll('dt')].map((node) => node.textContent)).toEqual([
        'De',
        'À',
        'Objet',
        'Statut',
        'Corps'
      ])
    } finally {
      await cleanup()
    }
  })

  test('marque un échec sans badge', async () => {
    const { container, cleanup } = await renderEnvelope(
      activity({
        type: 'communication.sent',
        contenu: JSON.stringify({ version: 2, sender: 'alice@exemple.fr', body: 'Relance' })
      }),
      true,
      undefined,
      [
        activity({
          type: 'communication.failed',
          contenu: JSON.stringify({ version: 2, reason: 'bounced' })
        })
      ]
    )
    try {
      const status = [...container.querySelectorAll('dd')].find((node) =>
        node.textContent?.includes('Échoué')
      )
      expect(status?.textContent).toBe('Échoué · Rebond')
      expect(status?.textContent).not.toContain('bounced')
      expect(status?.className).toContain('text-destructive')
      expect(container.querySelector('[data-slot="badge"]')).toBeNull()
    } finally {
      await cleanup()
    }
  })
})
