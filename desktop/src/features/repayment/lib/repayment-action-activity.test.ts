import { describe, expect, test } from 'bun:test'

import {
  actionTimelineDate,
  buildActionActivity,
  indexTodoRevisions,
  listOpenActions,
  mapDoneActionForm,
  mapTodoForm,
  parseActionActivity,
  previousTodoContent
} from '@/shared/lib/activities/action-activity'
import { parse_task_content, type Activite, type ActivityType } from '@/shared/types/activites'

function taskRow({
  id,
  type,
  state,
  title,
  threadId,
  revision,
  dueDate,
  assignee
}: {
  id: number
  type: ActivityType
  state: 'open' | 'completed' | 'ignored' | 'deleted'
  title: string
  threadId: string
  revision: number
  dueDate?: string
  assignee?: string
}): Activite {
  return {
    id,
    date_creation: `2026-08-${String(20 + id).padStart(2, '0')}T10:00:00`,
    rattachement: 'repayment:LOC-1',
    auteur: 'user:charles@example.org',
    id_client: 'CLI-1',
    id_locataire: 'LOC-1',
    id_lot: null,
    type,
    channel: null,
    mentions: [],
    contenu: JSON.stringify({
      version: 2,
      task: {
        title,
        state,
        ...(assignee ? { assignee: { id: assignee, label: assignee } } : {}),
        ...(dueDate ? { due_date: dueDate } : {})
      }
    }),
    thread_id: threadId,
    revision
  }
}

describe('action-activity v2', () => {
  test('mappe les formulaires de création et de réalisation', () => {
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

  test('construit une tâche ouverte avec EntityRef et échéance', () => {
    const activity = buildActionActivity('repayment', 'LOC-1', {
      mode: 'planifier',
      action: 'Contacter le garant',
      assigneA: 'alice@example.org',
      dateEcheance: '2026-08-30',
      note: 'Le garant est joignable le matin.'
    })

    expect(activity.type).toBe('task.created')
    expect(parse_task_content(activity.contenu ?? '')).toEqual({
      version: 2,
      task: {
        title: 'Contacter le garant',
        state: 'open',
        assignee: { id: 'alice@example.org', label: 'alice@example.org' },
        due_date: '2026-08-30'
      },
      note: 'Le garant est joignable le matin.'
    })
  })

  test('construit une tâche déjà réalisée', () => {
    const activity = buildActionActivity('repayment', 'LOC-1', {
      mode: 'enregistrer',
      action: 'Contacter le garant',
      resultat: 'Garant joint'
    })
    expect(activity.type).toBe('task.completed')
    expect(parse_task_content(activity.contenu ?? '')).toEqual({
      version: 2,
      task: { title: 'Contacter le garant', state: 'completed' },
      result: 'Garant joint'
    })
  })

  test('ne garde que le dernier snapshot ouvert de chaque thread, trié par échéance', () => {
    const later = taskRow({
      id: 1,
      type: 'task.created',
      state: 'open',
      title: 'Plus tard',
      threadId: 'task-later',
      revision: 1,
      dueDate: '2026-09-10'
    })
    const sooner = taskRow({
      id: 2,
      type: 'task.created',
      state: 'open',
      title: 'Plus tôt',
      threadId: 'task-sooner',
      revision: 1,
      dueDate: '2026-08-25'
    })
    const completed = taskRow({
      id: 3,
      type: 'task.completed',
      state: 'completed',
      title: 'Plus tard',
      threadId: 'task-later',
      revision: 2
    })

    expect(
      listOpenActions([later, sooner, completed]).map((item) => item.contenu.task.title)
    ).toEqual(['Plus tôt'])
  })

  test('parse le thread, la révision et le créateur de la tâche', () => {
    const created = taskRow({
      id: 4,
      type: 'task.created',
      state: 'open',
      title: 'Analyser le rejet',
      threadId: 'task-4',
      revision: 1
    })
    expect(parseActionActivity(created)).toMatchObject({
      event: 'task.created',
      state: 'open',
      threadId: 'task-4',
      revision: 1,
      createdBy: 'user:charles@example.org'
    })
    expect(parseActionActivity({ ...created, type: 'note.published' })).toBeNull()
    expect(parseActionActivity({ ...created, revision: null })).toBeNull()
  })

  test('indexe les révisions et retrouve le snapshot précédent', () => {
    const created = taskRow({
      id: 5,
      type: 'task.created',
      state: 'open',
      title: 'Analyser le rejet',
      threadId: 'task-5',
      revision: 1,
      assignee: 'alice@example.org'
    })
    const updated = taskRow({
      id: 6,
      type: 'task.updated',
      state: 'open',
      title: 'Analyser le rejet',
      threadId: 'task-5',
      revision: 2,
      assignee: 'bob@example.org'
    })
    const index = indexTodoRevisions([created, updated])

    expect(previousTodoContent(index, 'task-5', 2)).toEqual(parse_task_content(created.contenu))
    expect(previousTodoContent(index, 'task-5', 1)).toBeNull()
  })

  test('date chaque événement avec la date de sa ligne', () => {
    const row = taskRow({
      id: 7,
      type: 'task.completed',
      state: 'completed',
      title: 'Analyser le dossier',
      threadId: 'task-7',
      revision: 2
    })
    expect(actionTimelineDate(row)).toBe(row.date_creation)
  })
})
