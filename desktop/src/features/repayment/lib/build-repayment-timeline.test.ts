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
    type: 'note',
    statut: 'logged',
    mentions: [],
    contenu: 'Relance effectuée @amartin',
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
        contenu: 'Réponse @amartin'
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
        type: 'email_import',
        date_creation: '2026-08-27T12:00:00Z',
        contenu: JSON.stringify({
          version: 1,
          objet: 'Relance',
          corps: 'Bonjour',
          date_envoi: '2026-04-02T09:00:00Z'
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
        type: 'action',
        thread_id: 'todo-20',
        event: 'created',
        state: 'a_faire',
        revision: 1,
        contenu: JSON.stringify({
          version: 1,
          action: 'Appeler le locataire',
          etat: 'a_faire',
          assigne_a: 'user:alice@exemple.fr',
          date_echeance: '2026-08-25',
          cree_par: 'user:alice@exemple.fr',
          cree_le: '2026-08-20T10:00:00Z'
        })
      }),
      sampleActivity({
        id: 21,
        type: 'action',
        thread_id: 'todo-21',
        event: 'completed',
        state: 'fait',
        revision: 1,
        contenu: JSON.stringify({
          version: 1,
          action: 'Analyser le dossier',
          etat: 'fait',
          cree_par: 'user:alice@exemple.fr',
          cree_le: '2026-08-22T09:00:00Z'
        })
      })
    ])

    expect(items.filter((item) => item.source === 'activity').map((item) => item.id)).toEqual([
      'activity:21',
      'activity:20'
    ])
  })
})

describe('buildRepaymentTimeline boost notifications', () => {
  test('hides activity_boost events from the métier timeline', () => {
    const items = buildRepaymentTimeline(openDebtMovements, [
      sampleActivity({ id: 10, date_creation: '2026-06-13T10:00:00' }),
      sampleActivity({
        id: 11,
        type: 'activity_boost',
        date_creation: '2026-06-13T11:00:00',
        contenu: JSON.stringify({
          version: 1,
          activite_source_id: 10,
          type_activite_source: 'note',
          emoji: '👍'
        })
      })
    ])
    expect(items.filter((item) => item.source === 'activity').map((item) => item.id)).toEqual([
      'activity:10'
    ])
  })
})
