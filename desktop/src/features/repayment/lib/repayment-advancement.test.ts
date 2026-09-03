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
    channel: null,
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
          type: 'note.published',
          contenu: JSON.stringify({ version: 2, text: 'action: relance, phase: amiable' })
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
          type: 'case.group_changed',
          contenu: JSON.stringify({
            version: 2,
            before: 'non_traites',
            after: 'amiable'
          })
        }),
        activity({
          id: 2,
          date_creation: '2026-06-11 11:00',
          type: 'task.completed',
          thread_id: 'todo-1',
          revision: 2,
          contenu: JSON.stringify({
            version: 2,
            task: { title: 'Joindre le locataire', state: 'completed' }
          })
        }),
        activity({
          id: 3,
          date_creation: '2026-06-09 09:00',
          type: 'case.group_changed',
          contenu: JSON.stringify({
            version: 2,
            before: 'amiable',
            after: 'contentieux'
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
        type: 'case.group_changed',
        contenu: JSON.stringify({
          version: 2,
          before: 'non_traites',
          after: 'amiable'
        })
      }),
      activity({
        id: 2,
        date_creation: '2026-06-11 11:00',
        type: 'task.completed',
        thread_id: 'todo-1',
        revision: 2,
        contenu: JSON.stringify({
          version: 2,
          task: { title: 'Joindre le locataire', state: 'completed' }
        })
      }),
      activity({
        id: 3,
        date_creation: '2026-06-09 09:00',
        type: 'case.group_changed',
        contenu: JSON.stringify({
          version: 2,
          before: 'amiable',
          after: 'contentieux'
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
          type: 'case.group_changed',
          contenu: JSON.stringify({ version: 2, before: null, after: 'inconnu' })
        }),
        activity({
          id: 2,
          date_creation: '2026-06-11 11:00',
          type: 'task.completed',
          contenu: JSON.stringify({ version: 2, task: { title: '', state: 'completed' } })
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
          type: 'case.assignee_changed',
          contenu: JSON.stringify({
            version: 2,
            before: null,
            after: { id: 'old@example.org', label: 'old' }
          })
        }),
        activity({
          id: 2,
          date_creation: '2026-06-11 11:00',
          type: 'case.assignee_changed',
          contenu: JSON.stringify({
            version: 2,
            before: { id: 'old@example.org', label: 'old' },
            after: { id: 'cdubois@example.org', label: 'cdubois' }
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
        type: 'case.assignee_changed',
        contenu: JSON.stringify({
          version: 2,
          before: null,
          after: { id: 'old@example.org', label: 'old' }
        })
      }),
      activity({
        id: 2,
        date_creation: '2026-06-11 11:00',
        type: 'case.assignee_changed',
        contenu: JSON.stringify({
          version: 2,
          before: { id: 'old@example.org', label: 'old' },
          after: { id: 'cdubois@example.org', label: 'cdubois' }
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
      type: 'note.published',
      contenu: JSON.stringify({ version: 2, text: '' })
    })
    const newerLowId = activity({
      id: 1,
      date_creation: '2026-06-11 11:00',
      type: 'note.published',
      contenu: JSON.stringify({ version: 2, text: '' })
    })
    const newerHighId = activity({
      id: 3,
      date_creation: '2026-06-11 11:00',
      type: 'note.published',
      contenu: JSON.stringify({ version: 2, text: '' })
    })

    expect(
      sortRepaymentActivitiesDesc([older, newerLowId, newerHighId]).map((row) => row.id)
    ).toEqual([3, 1, 2])
  })

  test('ne mute pas le tableau d’entrée', () => {
    const first = activity({
      id: 1,
      date_creation: '2026-06-10 10:00',
      type: 'note.published',
      contenu: JSON.stringify({ version: 2, text: '' })
    })
    const second = activity({
      id: 2,
      date_creation: '2026-06-11 11:00',
      type: 'note.published',
      contenu: JSON.stringify({ version: 2, text: '' })
    })
    const input = [first, second]

    sortRepaymentActivitiesDesc(input)

    expect(input).toEqual([first, second])
    expect(input[0]).toBe(first)
    expect(input[1]).toBe(second)
  })
})
