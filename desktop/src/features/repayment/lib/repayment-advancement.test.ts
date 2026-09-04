import { describe, expect, test } from 'bun:test'

import type { Activite } from '@/shared/types/activites'

import { sortRepaymentActivitiesDesc } from './repayment-activity-order'
import {
  deriveRepaymentAdvancement,
  deriveRepaymentAdvancementFromSorted,
  deriveRepaymentGestionnaire,
  deriveRepaymentGestionnaireFromSorted
} from './repayment-advancement'

function activity(
  partial: Pick<Activite, 'id' | 'date_creation' | 'type' | 'contenu'> & Partial<Activite>
): Activite {
  return {
    rattachement: 'repayment:LOC-1',
    auteur: 'user:alice@exemple.fr',
    id_client: null,
    id_locataire: 'LOC-1',
    id_lot: null,
    statut: 'logged',
    mentions: [],
    ...partial
  }
}

describe('deriveRepaymentAdvancement', () => {
  test('ignore les champs ressemblants portés par une note', () => {
    expect(
      deriveRepaymentAdvancement([
        activity({
          id: 1,
          date_creation: '2026-06-12 12:00',
          type: 'note',
          contenu: JSON.stringify({ contenu: 'Note', action: 'relance', phase: 'amiable' })
        })
      ])
    ).toEqual({ bucket: null, action: null })
  })

  test('lit la phase et la dernière action réalisée', () => {
    expect(
      deriveRepaymentAdvancement([
        activity({
          id: 1,
          date_creation: '2026-06-10 10:00',
          type: 'case_bucket_change',
          contenu: JSON.stringify({
            version: 1,
            bucket_precedent: 'non_traites',
            bucket: 'amiable'
          })
        }),
        activity({
          id: 2,
          date_creation: '2026-06-11 11:00',
          type: 'action',
          thread_id: 'todo-1',
          event: 'completed',
          state: 'fait',
          revision: 2,
          contenu: JSON.stringify({
            version: 1,
            action: 'Joindre le locataire',
            etat: 'fait',
            cree_par: 'user:alice@exemple.fr',
            cree_le: '2026-06-10T10:00:00Z'
          })
        }),
        activity({
          id: 3,
          date_creation: '2026-06-09 09:00',
          type: 'case_bucket_change',
          contenu: JSON.stringify({
            version: 1,
            bucket_precedent: 'amiable',
            bucket: 'contentieux'
          })
        })
      ])
    ).toEqual({ bucket: 'amiable', action: 'Joindre le locataire' })
  })

  test('FromSorted égale le wrapper après tri canonique', () => {
    const unsorted = [
      activity({
        id: 1,
        date_creation: '2026-06-10 10:00',
        type: 'case_bucket_change',
        contenu: JSON.stringify({
          version: 1,
          bucket_precedent: 'non_traites',
          bucket: 'amiable'
        })
      }),
      activity({
        id: 2,
        date_creation: '2026-06-11 11:00',
        type: 'action',
        thread_id: 'todo-1',
        event: 'completed',
        state: 'fait',
        revision: 2,
        contenu: JSON.stringify({
          version: 1,
          action: 'Joindre le locataire',
          etat: 'fait',
          cree_par: 'user:alice@exemple.fr',
          cree_le: '2026-06-10T10:00:00Z'
        })
      }),
      activity({
        id: 3,
        date_creation: '2026-06-09 09:00',
        type: 'case_bucket_change',
        contenu: JSON.stringify({
          version: 1,
          bucket_precedent: 'amiable',
          bucket: 'contentieux'
        })
      })
    ]

    expect(deriveRepaymentAdvancementFromSorted(sortRepaymentActivitiesDesc(unsorted))).toEqual(
      deriveRepaymentAdvancement(unsorted)
    )
  })

  test('ignore les valeurs invalides', () => {
    expect(
      deriveRepaymentAdvancement([
        activity({
          id: 1,
          date_creation: '2026-06-10 10:00',
          type: 'case_bucket_change',
          contenu: JSON.stringify({ version: 1, bucket: 'inconnu' })
        }),
        activity({
          id: 2,
          date_creation: '2026-06-11 11:00',
          type: 'action',
          contenu: JSON.stringify({ version: 1, action: 'Inconnue', etat: 'fait' })
        })
      ])
    ).toEqual({ bucket: null, action: null })
  })
})

describe('deriveRepaymentGestionnaire', () => {
  test('retourne null sans affectation', () => {
    expect(deriveRepaymentGestionnaire([])).toEqual({ email: null, login: null })
  })

  test('lit la dernière affectation', () => {
    expect(
      deriveRepaymentGestionnaire([
        activity({
          id: 1,
          date_creation: '2026-06-10 10:00',
          type: 'case_assignment',
          contenu: JSON.stringify({
            version: 1,
            referent_precedent: null,
            referent: 'old@example.org'
          })
        }),
        activity({
          id: 2,
          date_creation: '2026-06-11 11:00',
          type: 'case_assignment',
          contenu: JSON.stringify({
            version: 1,
            referent_precedent: 'old@example.org',
            referent: 'cdubois@example.org'
          })
        })
      ])
    ).toEqual({ email: 'cdubois@example.org', login: 'cdubois' })
  })

  test('FromSorted égale le wrapper après tri canonique', () => {
    const unsorted = [
      activity({
        id: 1,
        date_creation: '2026-06-10 10:00',
        type: 'case_assignment',
        contenu: JSON.stringify({
          version: 1,
          referent_precedent: null,
          referent: 'old@example.org'
        })
      }),
      activity({
        id: 2,
        date_creation: '2026-06-11 11:00',
        type: 'case_assignment',
        contenu: JSON.stringify({
          version: 1,
          referent_precedent: 'old@example.org',
          referent: 'cdubois@example.org'
        })
      })
    ]

    expect(deriveRepaymentGestionnaireFromSorted(sortRepaymentActivitiesDesc(unsorted))).toEqual(
      deriveRepaymentGestionnaire(unsorted)
    )
  })
})

describe('sortRepaymentActivitiesDesc', () => {
  test('ordonne par date puis id, les plus récents d’abord', () => {
    const older = activity({
      id: 2,
      date_creation: '2026-06-10 10:00',
      type: 'note',
      contenu: ''
    })
    const newerLowId = activity({
      id: 1,
      date_creation: '2026-06-11 11:00',
      type: 'note',
      contenu: ''
    })
    const newerHighId = activity({
      id: 3,
      date_creation: '2026-06-11 11:00',
      type: 'note',
      contenu: ''
    })

    expect(
      sortRepaymentActivitiesDesc([older, newerLowId, newerHighId]).map((row) => row.id)
    ).toEqual([3, 1, 2])
  })

  test('ne mute pas le tableau d’entrée', () => {
    const first = activity({
      id: 1,
      date_creation: '2026-06-10 10:00',
      type: 'note',
      contenu: ''
    })
    const second = activity({
      id: 2,
      date_creation: '2026-06-11 11:00',
      type: 'note',
      contenu: ''
    })
    const input = [first, second]

    sortRepaymentActivitiesDesc(input)

    expect(input).toEqual([first, second])
    expect(input[0]).toBe(first)
    expect(input[1]).toBe(second)
  })
})
