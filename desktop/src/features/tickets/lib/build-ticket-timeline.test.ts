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
    type: 'note.published',
    channel: null,
    mentions: [],
    contenu: JSON.stringify({ version: 2, text: 'Relance effectuée' }),
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
        contenu: JSON.stringify({ version: 2, text: 'Réponse @cdubois' })
      }),
      sampleActivity({
        id: 9,
        date_creation: '2026-06-09T10:00:00',
        type: 'communication.received',
        channel: 'rcs',
        contenu: JSON.stringify({ version: 2, sender: 'Locataire', body: 'SMS' })
      })
    ])
    expect(items.map((item) => item.row.id)).toEqual([11, 10, 9])
  })

  test('projects ordered delivery statuses without standalone technical rows', () => {
    const sent = sampleActivity({
      id: 10,
      type: 'communication.sent',
      channel: 'email',
      thread_id: 'mail-1',
      date_creation: '2026-06-10T10:00:00',
      contenu: JSON.stringify({ version: 2, sender: 'Alice', body: 'Bonjour' })
    })
    const failed = sampleActivity({
      id: 20,
      type: 'communication.sent',
      channel: 'rcs',
      thread_id: 'rcs-1',
      date_creation: '2026-06-09T10:00:00',
      contenu: JSON.stringify({ version: 2, sender: 'Alice', body: 'Bonjour' })
    })
    const items = buildTicketTimeline([
      sampleActivity({
        id: 12,
        type: 'communication.ok',
        thread_id: 'mail-1',
        date_creation: '2026-06-10T12:00:00',
        contenu: JSON.stringify({ version: 2, result: 'read' })
      }),
      sampleActivity({
        id: 11,
        type: 'communication.ok',
        thread_id: 'mail-1',
        date_creation: '2026-06-10T11:00:00',
        contenu: JSON.stringify({ version: 2, result: 'delivered' })
      }),
      sampleActivity({
        id: 21,
        type: 'communication.failed',
        thread_id: 'rcs-1',
        date_creation: '2026-06-09T11:00:00',
        contenu: JSON.stringify({ version: 2, reason: 'Destinataire inconnu' })
      }),
      sampleActivity({
        id: 30,
        type: 'communication.failed',
        thread_id: 'orphan',
        date_creation: '2026-06-11T11:00:00',
        contenu: JSON.stringify({ version: 2, reason: 'Sans origine' })
      }),
      failed,
      sent
    ])

    expect(items.map((item) => item.row.id)).toEqual([10, 20])
    expect(items[0]?.statuses.map((status) => status.id)).toEqual([11, 12])
    expect(items[1]?.statuses.map((status) => status.id)).toEqual([21])
    expect(items.flatMap((item) => item.statuses).map((status) => status.id)).toEqual([11, 12, 21])
  })

  test('hides reaction events', () => {
    const items = buildTicketTimeline([
      sampleActivity({ id: 10 }),
      sampleActivity({
        id: 11,
        type: 'activity.reaction_changed',
        contenu: JSON.stringify({
          version: 2,
          source_activity_id: 10,
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
    expect(items[0]?.row.type).toBe('communication.received')
    expect(items[0]?.row.channel).toBe('email')
    expect(JSON.parse(items[0]!.row.contenu).body).toBe(message.trim())
  })

  test('supports the message source field and a deterministic missing-date fallback', () => {
    const items = buildTicketTimeline([], {
      id_reclamation: 'REC-2',
      message: 'Ancien message'
    })
    expect(items[0]?.date).toBe('1970-01-01T00:00:00Z')
    expect(JSON.parse(items[0]!.row.contenu).body).toBe('Ancien message')
  })
})
