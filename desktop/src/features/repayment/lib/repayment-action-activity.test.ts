import { describe, expect, test } from 'bun:test'

import {
  actionTimelineDate,
  buildActionActivity,
  listOpenActions,
  mapDoneActionForm,
  mapTodoForm,
  parseActionActivity,
  todoTimelineSentence
} from '@/shared/lib/activities/action-activity'
import { parse_action_creation_content } from '@/shared/types/activites'
import type { Activite } from '@/shared/types/activites'

function actionRow(
  id: number,
  contenu: Record<string, unknown>,
  date = '2026-08-20T10:00:00'
): Activite {
  return {
    id,
    date_creation: date,
    rattachement: 'repayment:LOC-1',
    auteur: 'user:charles@example.org',
    id_client: 'CLI-1',
    id_locataire: 'LOC-1',
    id_lot: null,
    type: 'action',
    statut: 'logged',
    mentions: [],
    contenu: JSON.stringify({
      version: 1,
      cree_par: 'user:charles@example.org',
      cree_le: date,
      ...contenu
    }),
    thread_id: `todo-${id}`,
    event:
      contenu['etat'] === 'fait'
        ? 'completed'
        : contenu['etat'] === 'ignore'
          ? 'ignored'
          : 'created',
    state: contenu['etat'] as 'a_faire' | 'fait' | 'ignore',
    revision: 1
  }
}

describe('action-activity', () => {
  test('mapTodoForm planifie même pour aujourd’hui ; mapDoneActionForm enregistre', () => {
    expect(
      mapTodoForm({
        action: '',
        assigneA: 'alice',
        dateEcheance: '2026-08-24',
        note: 'note'
      })
    ).toBeNull()

    expect(
      mapTodoForm({
        action: 'Joindre le locataire',
        assigneA: 'bob@example.org',
        dateEcheance: '2026-08-24',
        note: 'relance'
      })
    ).toEqual({
      mode: 'planifier',
      action: 'Joindre le locataire',
      assigneA: 'bob@example.org',
      dateEcheance: '2026-08-24',
      note: 'relance'
    })

    expect(mapDoneActionForm({ action: '', commentaire: 'appel ok' })).toBeNull()
    expect(mapDoneActionForm({ action: 'Joindre le locataire', commentaire: 'appel ok' })).toEqual({
      mode: 'enregistrer',
      action: 'Joindre le locataire',
      resultat: 'appel ok'
    })
  })

  test('planifie une action libre avec assigné et échéance', () => {
    const activity = buildActionActivity('repayment', 'LOC-1', {
      mode: 'planifier',
      action: 'Contacter le garant',
      assigneA: 'alice@example.org',
      dateEcheance: '2026-08-30',
      note: 'Le garant est joignable le matin.'
    })

    expect(activity.type).toBe('action')
    expect(parse_action_creation_content(activity.contenu ?? '')).toEqual({
      version: 1,
      action: 'Contacter le garant',
      etat: 'a_faire',
      assigne_a: 'alice@example.org',
      date_echeance: '2026-08-30',
      note: 'Le garant est joignable le matin.'
    })
  })

  test('listOpenActions ne garde que les a_faire, triées par échéance', () => {
    const later = actionRow(1, {
      action: 'Plus tard',
      etat: 'a_faire',
      assigne_a: 'alice@example.org',
      date_echeance: '2026-09-10'
    })
    const sooner = actionRow(
      2,
      {
        action: 'Plus tôt',
        etat: 'a_faire',
        assigne_a: 'bob@example.org',
        date_echeance: '2026-08-25'
      },
      '2026-08-21T10:00:00'
    )
    const done = actionRow(3, {
      action: 'Déjà fait',
      etat: 'fait'
    })

    expect(listOpenActions([later, done, sooner]).map((item) => item.contenu.action)).toEqual([
      'Plus tôt',
      'Plus tard'
    ])
  })

  test('date chaque événement avec la date de sa ligne', () => {
    const base = {
      date_creation: '2026-08-20T10:00:00',
      rattachement: 'repayment:LOC-1',
      auteur: 'user:charles@example.org',
      id_client: 'CLI-1',
      id_locataire: 'LOC-1',
      id_lot: null,
      type: 'action' as const,
      statut: null,
      mentions: []
    }
    const done = {
      ...base,
      id: 2,
      contenu: JSON.stringify({
        version: 1,
        action: 'Analyser le dossier',
        etat: 'fait',
        cree_par: 'user:charles@example.org',
        cree_le: '2026-08-20T10:00:00'
      }),
      thread_id: 'todo-2',
      event: 'completed' as const,
      state: 'fait' as const,
      revision: 2
    }

    expect(actionTimelineDate(done)).toBe('2026-08-20T10:00:00')
  })

  test('todoTimelineSentence décrit la création avec responsable et échéance', () => {
    const created = parseActionActivity(
      actionRow(4, {
        action: 'Analyser un rejet de prélèvement',
        etat: 'a_faire',
        assigne_a: 'user:gregoire@exemple.fr',
        date_echeance: '2026-08-28'
      })
    )
    expect(created).not.toBeNull()
    expect(todoTimelineSentence(created!, null)).toEqual([
      { type: 'text', text: 'a créé' },
      { type: 'text', text: 'la tâche' },
      { type: 'title', text: 'Analyser un rejet de prélèvement' },
      { type: 'text', text: 'assignée à' },
      { type: 'person', identity: 'user:gregoire@exemple.fr' },
      { type: 'text', text: 'pour le' },
      { type: 'date', iso: '2026-08-28' }
    ])
  })

  test('todoTimelineSentence décrit la réalisation avec responsable et échéance', () => {
    const completed = parseActionActivity(
      actionRow(8, {
        action: 'Analyser un rejet de prélèvement',
        etat: 'fait',
        assigne_a: 'user:abraconnier@exemple.fr',
        date_echeance: '2026-08-29'
      })
    )
    expect(completed).not.toBeNull()
    expect(todoTimelineSentence(completed!, null)).toEqual([
      { type: 'text', text: 'a réalisé' },
      { type: 'text', text: 'la tâche' },
      { type: 'title', text: 'Analyser un rejet de prélèvement' },
      { type: 'text', text: 'assignée à' },
      { type: 'person', identity: 'user:abraconnier@exemple.fr' },
      { type: 'text', text: 'pour le' },
      { type: 'date', iso: '2026-08-29' }
    ])
  })

  test('todoTimelineSentence distingue échéance, responsable et libellé', () => {
    const previous = {
      version: 1 as const,
      action: 'Analyser un rejet de prélèvement',
      etat: 'a_faire' as const,
      assigne_a: 'user:alice@exemple.fr',
      date_echeance: '2026-08-20',
      cree_par: 'user:charles@example.org',
      cree_le: '2026-08-20T10:00:00'
    }
    const due = parseActionActivity(
      actionRow(5, {
        action: previous.action,
        etat: 'a_faire',
        assigne_a: previous.assigne_a,
        date_echeance: '2026-08-28'
      })
    )!
    due.event = 'updated'
    due.revision = 2
    expect(todoTimelineSentence(due, previous)).toEqual([
      { type: 'text', text: 'a modifié l’échéance de' },
      { type: 'text', text: 'la tâche' },
      { type: 'title', text: previous.action },
      { type: 'text', text: 'au' },
      { type: 'date', iso: '2026-08-28' }
    ])

    const assignee = parseActionActivity(
      actionRow(6, {
        action: previous.action,
        etat: 'a_faire',
        assigne_a: 'user:bob@exemple.fr',
        date_echeance: previous.date_echeance
      })
    )!
    assignee.event = 'updated'
    expect(todoTimelineSentence(assignee, previous)).toEqual([
      { type: 'text', text: 'a modifié le responsable de' },
      { type: 'text', text: 'la tâche' },
      { type: 'title', text: previous.action },
      { type: 'text', text: 'à' },
      { type: 'person', identity: 'user:bob@exemple.fr' }
    ])

    const both = parseActionActivity(
      actionRow(7, {
        action: previous.action,
        etat: 'a_faire',
        assigne_a: 'user:bob@exemple.fr',
        date_echeance: '2026-08-28'
      })
    )!
    both.event = 'updated'
    expect(todoTimelineSentence(both, previous)).toEqual([
      { type: 'text', text: 'a modifié l’échéance et le responsable de' },
      { type: 'text', text: 'la tâche' },
      { type: 'title', text: previous.action },
      { type: 'text', text: 'au' },
      { type: 'date', iso: '2026-08-28' },
      { type: 'text', text: 'à' },
      { type: 'person', identity: 'user:bob@exemple.fr' }
    ])
  })
})
