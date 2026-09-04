import { describe, expect, test } from 'bun:test'

import type { Activite } from '@/shared/types/activites'

import { buildTicketTimeline } from './build-ticket-timeline'

function sampleActivity(overrides: Partial<Activite> = {}): Activite {
  return {
    id: 1,
    date_creation: '2026-06-10T14:00:00',
    rattachement: 'tickets:REC-1',
    auteur: 'user:cdubois@exemple.fr',
    id_client: 'CLI-1',
    id_locataire: 'LOC-1',
    id_lot: 'LOT-1',
    type: 'note',
    statut: 'logged',
    mentions: [],
    contenu: 'Relance effectuée',
    ...overrides
  }
}

describe('buildTicketTimeline', () => {
  test('sorts activities descending by date', () => {
    const items = buildTicketTimeline([
      sampleActivity({ id: 1, date_creation: '2026-06-01T10:00:00' }),
      sampleActivity({ id: 2, date_creation: '2026-06-10T14:00:00' })
    ])
    expect(items[0]?.row.id).toBe(2)
    expect(items[1]?.row.id).toBe(1)
  })

  test('keeps every note as its own L1 entry by date', () => {
    const items = buildTicketTimeline([
      sampleActivity({ id: 10, date_creation: '2026-06-10T14:00:00' }),
      sampleActivity({
        id: 11,
        date_creation: '2026-06-10T15:00:00',
        contenu: 'Réponse @cdubois'
      }),
      sampleActivity({
        id: 9,
        date_creation: '2026-06-09T10:00:00',
        type: 'rcs',
        contenu: 'SMS'
      })
    ])
    expect(items.map((item) => item.row.id)).toEqual([11, 10, 9])
  })

  test('hides activity_boost events', () => {
    const items = buildTicketTimeline([
      sampleActivity({ id: 10 }),
      sampleActivity({
        id: 11,
        type: 'activity_boost',
        contenu: JSON.stringify({
          version: 1,
          activite_source_id: 10,
          type_activite_source: 'note',
          emoji: '👍'
        })
      })
    ])
    expect(items.map((item) => item.row.id)).toEqual([10])
  })

  test('always derives the initial reception as a received email with full content', () => {
    const message = 'Contenu intégral '.repeat(20)
    const items = buildTicketTimeline([], {
      id_reclamation: 'REC-1',
      id_locataire: 'LOC-1',
      cree_le: '2026-06-01T08:30:00Z',
      message_initial: message
    })
    expect(items).toHaveLength(1)
    expect(items[0]?.source).toBe('initial-reception')
    expect(items[0]?.row.type).toBe('email')
    expect(items[0]?.row.statut).toBe('received')
    expect(JSON.parse(items[0]!.row.contenu).corps).toBe(message.trim())
  })

  test('supports legacy message and a deterministic missing-date fallback', () => {
    const items = buildTicketTimeline([], {
      id_reclamation: 'REC-2',
      message: 'Ancien message'
    })
    expect(items[0]?.date).toBe('1970-01-01T00:00:00Z')
    expect(JSON.parse(items[0]!.row.contenu).corps).toBe('Ancien message')
  })
})
