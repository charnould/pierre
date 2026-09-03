import { describe, expect, test } from 'bun:test'

import type { Activite } from '@/shared/types/activites'

import {
  buildRepaymentTimeline,
  computeMovementBalances,
  finalMovementBalance,
  mapLedgerMovementToEntry,
  mapNotificationToEntry,
  movementAmountLabel,
  movementCategoryLabel,
  movementOnOrAfterPeriod
} from './build-repayment-timeline'

function sampleActivity(overrides: Partial<Activite> = {}): Activite {
  return {
    id: 1,
    date_creation: '2026-06-10T14:00:00',
    rattachement: 'repayment:LOC-1',
    auteur: 'user:cdubois@exemple.fr',
    id_client: 'CLI-1',
    id_locataire: 'LOC-1',
    id_lot: 'LOT-1',
    type: 'note.published',
    channel: null,
    mentions: [],
    contenu: JSON.stringify({ version: 2, text: 'Relance effectuée @amartin' }),
    ...overrides
  }
}

/** Open debt episode starting April 2026 (first unpaid). */
const openDebtMovements = [
  {
    date_exigibilite: '2026-04-05T09:00:00',
    montant_en_euros: 500,
    categorie: 'loyer_principal'
  },
  {
    date_exigibilite: '2026-05-05T09:00:00',
    montant_en_euros: 500,
    categorie: 'loyer_principal'
  },
  {
    date_exigibilite: '2026-06-05T09:00:00',
    montant_en_euros: 500,
    categorie: 'loyer_principal'
  },
  {
    date_exigibilite: '2026-06-12T11:00:00',
    montant_en_euros: -200,
    categorie: 'encaissement_locataire'
  }
]

describe('mapLedgerMovementToEntry', () => {
  test('maps movement fields', () => {
    const entry = mapLedgerMovementToEntry({
      date_exigibilite: '2026-06-05T09:00:00',
      montant_en_euros: 500,
      categorie: 'loyer_principal'
    })
    expect(entry.source).toBe('movement')
    expect(entry.id).toBe('movement:2026-06-05T09:00:00:500')
    expect(entry.date).toBe('2026-06-05T09:00:00')
  })
})

describe('movementCategoryLabel', () => {
  test('returns known label', () => {
    expect(movementCategoryLabel('loyer_principal')).toBe('Loyer principal')
  })

  test('humanizes unknown category', () => {
    expect(movementCategoryLabel('custom_categorie')).toBe('custom categorie')
  })
})

describe('movementAmountLabel', () => {
  test('formats signed amounts', () => {
    expect(movementAmountLabel({ montant_en_euros: 500 })).toMatch(/^\+/)
    expect(movementAmountLabel({ montant_en_euros: -200 })).toMatch(/^-/)
    expect(movementAmountLabel({})).toBeNull()
  })
})

describe('movementOnOrAfterPeriod', () => {
  test('includes movements from the unpaid month onward', () => {
    expect(movementOnOrAfterPeriod({ date_exigibilite: '2026-04-05T09:00:00' }, '2026-04')).toBe(
      true
    )
    expect(movementOnOrAfterPeriod({ date_exigibilite: '2026-03-31T09:00:00' }, '2026-04')).toBe(
      false
    )
  })
})

describe('buildRepaymentTimeline', () => {
  test('keeps activities when there is no debt episode', () => {
    expect(buildRepaymentTimeline([], [sampleActivity()]).map((item) => item.id)).toEqual([
      'activity:1'
    ])
    expect(
      buildRepaymentTimeline(
        [
          {
            date_exigibilite: '2026-01-05T09:00:00',
            montant_en_euros: 100
          },
          {
            date_exigibilite: '2026-01-10T09:00:00',
            montant_en_euros: -100
          }
        ],
        [sampleActivity()],
        { currentBalance: 0 }
      ).map((item) => item.id)
    ).toEqual(['activity:1'])
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
    const items = buildRepaymentTimeline(
      [],
      [
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
      ]
    )

    expect(items.map((item) => item.id)).toEqual(['activity:10', 'activity:20'])
    const activityItems = items.filter((item) => item.source === 'activity')
    expect(activityItems[0]?.statuses.map((status) => status.id)).toEqual([11, 12])
    expect(activityItems[1]?.statuses.map((status) => status.id)).toEqual([21])
    expect(activityItems.flatMap((item) => item.statuses).map((status) => status.id)).toEqual([
      11, 12, 21
    ])
  })

  test('merges and sorts DESC by date within the unpaid episode', () => {
    const items = buildRepaymentTimeline(openDebtMovements, [
      sampleActivity({ id: 10, date_creation: '2026-06-13T10:00:00' })
    ])

    expect(items[0]?.source).toBe('activity')
    expect(items.some((item) => item.id === 'movement:2026-04-05T09:00:00:500')).toBe(true)
  })

  test('keeps every note as its own L1 entry by date', () => {
    const items = buildRepaymentTimeline(openDebtMovements, [
      sampleActivity({ id: 10, date_creation: '2026-06-13T10:00:00' }),
      sampleActivity({
        id: 11,
        date_creation: '2026-06-13T11:00:00',
        contenu: JSON.stringify({ version: 2, text: 'Réponse @amartin' })
      })
    ])

    expect(items.some((item) => item.id === 'activity:11')).toBe(true)
    expect(items.some((item) => item.id === 'activity:10')).toBe(true)
    const later = items.find((item) => item.id === 'activity:11')
    const root = items.find((item) => item.id === 'activity:10')
    expect(later && root && items.indexOf(later) < items.indexOf(root)).toBe(true)
  })

  test('excludes movements before firstUnpaidPeriod but keeps earlier activities', () => {
    const priorSettled = [
      {
        date_exigibilite: '2025-01-05T09:00:00',
        montant_en_euros: 100
      },
      {
        date_exigibilite: '2025-01-20T09:00:00',
        montant_en_euros: -100
      },
      ...openDebtMovements
    ]
    const items = buildRepaymentTimeline(priorSettled, [
      sampleActivity({ id: 1, date_creation: '2025-01-10T10:00:00' }),
      sampleActivity({ id: 2, date_creation: '2026-06-10T10:00:00' })
    ])

    expect(items.some((item) => item.id === 'movement:2025-01-05T09:00:00:100')).toBe(false)
    expect(items.some((item) => item.id === 'movement:2025-01-20T09:00:00:-100')).toBe(false)
    expect(items.some((item) => item.id === 'movement:2026-04-05T09:00:00:500')).toBe(true)
    expect(items.some((item) => item.id === 'activity:1')).toBe(true)
    expect(items.some((item) => item.id === 'activity:2')).toBe(true)
  })

  test('keeps soldeAfter from full history when older movements are hidden', () => {
    const priorSettled = [
      {
        date_exigibilite: '2025-01-05T09:00:00',
        montant_en_euros: 100
      },
      {
        date_exigibilite: '2025-01-20T09:00:00',
        montant_en_euros: -100
      },
      ...openDebtMovements
    ]
    const items = buildRepaymentTimeline(priorSettled, [])
    const firstVisible = items.find((item) => item.id === 'movement:2026-04-05T09:00:00:500')
    expect(firstVisible?.source).toBe('movement')
    if (firstVisible?.source === 'movement') {
      // Full history settled to 0 before April, so April loyer → 500
      expect(firstVisible.soldeAfter).toBe(500)
    }
  })

  test('mapNotificationToEntry prefixes id', () => {
    const entry = mapNotificationToEntry(sampleActivity({ id: 42 }))
    expect(entry.id).toBe('activity:42')
  })

  test('range un courriel importé sur sa date d’upload', () => {
    const entry = mapNotificationToEntry(
      sampleActivity({
        id: 9,
        type: 'communication.imported',
        channel: 'email',
        date_creation: '2026-08-27T12:00:00Z',
        contenu: JSON.stringify({
          version: 2,
          sender: 'Alice',
          subject: 'Relance',
          body: 'Bonjour'
        })
      })
    )
    expect(entry.date).toBe('2026-08-27T12:00:00Z')
  })

  test('attaches running balance to movement entries', () => {
    const items = buildRepaymentTimeline(
      [
        {
          date_exigibilite: '2026-06-05T09:00:00',
          montant_en_euros: 300,
          categorie: 'loyer_principal'
        },
        {
          date_exigibilite: '2026-06-12T11:00:00',
          montant_en_euros: -100,
          categorie: 'encaissement_locataire'
        }
      ],
      []
    )

    const newest = items.find(
      (item) => item.source === 'movement' && item.id === 'movement:2026-06-12T11:00:00:-100'
    )
    const oldest = items.find(
      (item) => item.source === 'movement' && item.id === 'movement:2026-06-05T09:00:00:300'
    )

    expect(newest?.source).toBe('movement')
    if (newest?.source === 'movement') {
      expect(newest.soldeAfter).toBe(200)
      expect(newest.soldeDelta).toBe(-100)
    }
    if (oldest?.source === 'movement') {
      expect(oldest.soldeAfter).toBe(300)
      expect(oldest.soldeDelta).toBeNull()
    }
  })

  test('finalMovementBalance matches last running total', () => {
    expect(finalMovementBalance(openDebtMovements)).toBe(1300)
  })

  test('gives colliding ID-less movements stable unique keys without changing their order', () => {
    const first = {
      date_exigibilite: '2026-06-05T09:00:00',
      montant_en_euros: 100,
      categorie: 'loyer_principal'
    }
    const second = {
      date_exigibilite: '2026-06-05T09:00:00',
      montant_en_euros: 100,
      categorie: 'charges'
    }

    const firstBuild = buildRepaymentTimeline([first, second], [], { currentBalance: 200 })
    const secondBuild = buildRepaymentTimeline([first, second], [], { currentBalance: 200 })

    expect(firstBuild.map((item) => item.id)).toEqual(secondBuild.map((item) => item.id))
    expect(new Set(firstBuild.map((item) => item.id)).size).toBe(2)
    expect(firstBuild.map((item) => item.source === 'movement' && item.row)).toEqual([
      first,
      second
    ])
    expect(firstBuild.map((item) => (item.source === 'movement' ? item.soldeAfter : null))).toEqual(
      [100, 200]
    )
  })
})

describe('computeMovementBalances', () => {
  test('cumulates montants in chronological order', () => {
    const balances = computeMovementBalances([
      { date_exigibilite: '2026-06-12', montant_en_euros: -100 },
      { date_exigibilite: '2026-06-05', montant_en_euros: 300 }
    ])

    expect(balances.get('movement:2026-06-05:300')).toEqual({ soldeAfter: 300, soldeDelta: null })
    expect(balances.get('movement:2026-06-12:-100')).toEqual({ soldeAfter: 200, soldeDelta: -100 })
  })

  test('cumule dans l’ordre des dates comptables DD/MM/YYYY, pas alphabétique', () => {
    const balances = computeMovementBalances([
      { date_exigibilite: '05/01/2024', montant_en_euros: 100 },
      { date_exigibilite: '28/02/2024', montant_en_euros: -40 },
      { date_exigibilite: '10/03/2024', montant_en_euros: 25 }
    ])

    expect(balances.get('movement:05/01/2024:100')).toEqual({ soldeAfter: 100, soldeDelta: null })
    expect(balances.get('movement:28/02/2024:-40')).toEqual({ soldeAfter: 60, soldeDelta: -40 })
    expect(balances.get('movement:10/03/2024:25')).toEqual({ soldeAfter: 85, soldeDelta: 25 })
  })

  test('solde un paiement intégral malgré la dérive flottante', () => {
    const balances = computeMovementBalances([
      { date_exigibilite: '05/01/2024', montant_en_euros: 199.09 },
      { date_exigibilite: '05/02/2024', montant_en_euros: 645.97 },
      { date_exigibilite: '13/03/2024', montant_en_euros: -845.06 }
    ])

    expect(balances.get('movement:05/02/2024:645.97')?.soldeAfter).toBe(845.06)
    expect(balances.get('movement:13/03/2024:-845.06')?.soldeAfter).toBe(0)
  })
})

describe('buildRepaymentTimeline — ordre chronologique', () => {
  const movements = [
    { date_exigibilite: '05/01/2024', montant_en_euros: 100 },
    { date_exigibilite: '28/02/2024', montant_en_euros: -40 },
    { date_exigibilite: '10/03/2024', montant_en_euros: 25 }
  ]

  test('range les mouvements du plus récent au plus ancien', () => {
    const items = buildRepaymentTimeline(movements, [])

    expect(items.map((item) => item.id)).toEqual([
      'movement:10/03/2024:25',
      'movement:28/02/2024:-40',
      'movement:05/01/2024:100'
    ])
  })

  test('affiche le solde après le paiement de février à 60 €', () => {
    const february = buildRepaymentTimeline(movements, []).find(
      (item) => item.id === 'movement:28/02/2024:-40'
    )

    expect(february?.source).toBe('movement')
    if (february?.source === 'movement') {
      expect(february.soldeAfter).toBe(60)
    }
  })

  test('entrelace une notification ISO et des mouvements à barres obliques', () => {
    const items = buildRepaymentTimeline(movements, [
      sampleActivity({ id: 10, date_creation: '2024-02-14T10:00:00' })
    ])

    expect(items.map((item) => item.id)).toEqual([
      'movement:10/03/2024:25',
      'movement:28/02/2024:-40',
      'activity:10',
      'movement:05/01/2024:100'
    ])
  })
})

describe('buildRepaymentTimeline open actions', () => {
  test('conserve tous les événements todo dans la timeline', () => {
    const items = buildRepaymentTimeline(openDebtMovements, [
      sampleActivity({
        id: 20,
        type: 'task.created',
        thread_id: 'todo-20',
        revision: 1,
        contenu: JSON.stringify({
          version: 2,
          task: {
            title: 'Appeler le locataire',
            state: 'open',
            assignee: { id: 'user:alice@exemple.fr', label: 'Alice' },
            due_date: '2026-08-25'
          }
        })
      }),
      sampleActivity({
        id: 21,
        type: 'task.completed',
        thread_id: 'todo-21',
        revision: 1,
        contenu: JSON.stringify({
          version: 2,
          task: { title: 'Analyser le dossier', state: 'completed' }
        })
      })
    ])

    expect(items.filter((item) => item.source === 'activity').map((item) => item.id)).toEqual([
      'activity:21',
      'activity:20'
    ])
  })
})

describe('buildRepaymentTimeline reaction notifications', () => {
  test('hides reaction events from the métier timeline', () => {
    const items = buildRepaymentTimeline(openDebtMovements, [
      sampleActivity({ id: 10, date_creation: '2026-06-13T10:00:00' }),
      sampleActivity({
        id: 11,
        type: 'activity.reaction_changed',
        date_creation: '2026-06-13T11:00:00',
        contenu: JSON.stringify({
          version: 2,
          source_activity_id: 10,
          emoji: '👍'
        })
      })
    ])
    expect(items.filter((item) => item.source === 'activity').map((item) => item.id)).toEqual([
      'activity:10'
    ])
  })
})
