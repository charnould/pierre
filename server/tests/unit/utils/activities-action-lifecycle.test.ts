import { Database } from 'bun:sqlite'
import { describe, expect, it } from 'bun:test'

import { parseContentJson } from '../../../../shared/activity-content'
import { list_activities } from '../../../utils/activities/query'
import { get_activity } from '../../../utils/activities/rows'
import { create_activity, delete_activity, patch_activity } from '../../../utils/activities/write'
import {
  ALICE,
  BOB,
  CLAIRE,
  mention,
  seed_users,
  use_activities_test_env,
  user
} from './activities-test-env'

const paths = use_activities_test_env('action_lifecycle')

const task_content = (assignee = BOB) =>
  JSON.stringify({
    version: 2,
    task: {
      title: 'Contacter le garant',
      state: 'open',
      assignee: { id: assignee, label: assignee },
      due_date: '2026-08-30'
    },
    note: 'Premier contact.'
  })

describe('action lifecycle', () => {
  it('planifie, réalise, replanifie puis ignore une tâche append-only', async () => {
    await seed_users(ALICE, BOB, CLAIRE)
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-ACTION',
      type: 'task.created',
      contenu: task_content()
    })
    const createdContent = created.contenu

    expect(created).toMatchObject({ type: 'task.created', revision: 1 })
    expect(
      list_activities(ALICE, {
        rattachement: 'repayment:LOC-ACTION',
        currentThreads: true,
        state: 'open'
      }).map((row) => row.id)
    ).toEqual([created.id])
    expect(created.mentions).toContainEqual(mention(BOB, 'assignation'))

    const completed = patch_activity(CLAIRE, created.id, {
      operation: 'complete_action',
      resultat: 'Garant joint.'
    })
    expect(parseContentJson(completed.contenu)).toMatchObject({
      version: 2,
      task: { state: 'completed' },
      result: 'Garant joint.'
    })
    expect(completed).toMatchObject({
      auteur: user(CLAIRE),
      type: 'task.completed',
      threadId: created.threadId,
      revision: 2
    })
    expect(get_activity(created.id)?.contenu).toBe(createdContent)

    expect(() =>
      patch_activity(ALICE, created.id, {
        operation: 'reopen_action',
        assigneA: BOB,
        dateEcheance: '2026-09-02'
      })
    ).toThrow(/changed since it was loaded/)

    const reopened = patch_activity(ALICE, completed.id, {
      operation: 'reopen_action',
      assigneA: BOB,
      dateEcheance: '2026-09-02'
    })
    expect(parseContentJson(reopened.contenu)).toMatchObject({
      version: 2,
      task: {
        state: 'open',
        assignee: { id: user(BOB) },
        due_date: '2026-09-02'
      }
    })

    const ignored = patch_activity(ALICE, reopened.id, {
      operation: 'ignore_action',
      motif: 'Sans objet.'
    })
    expect(parseContentJson(ignored.contenu)).toMatchObject({
      version: 2,
      task: { state: 'ignored' },
      reason: 'Sans objet.'
    })
    expect(ignored).toMatchObject({
      auteur: user(ALICE),
      type: 'task.ignored',
      revision: 4
    })
    expect(
      list_activities(ALICE, {
        rattachement: 'repayment:LOC-ACTION',
        currentThreads: true
      }).map((row) => row.id)
    ).toEqual([ignored.id])

    delete_activity(ALICE, ignored.id)
    const rows = list_activities(ALICE, {
      rattachement: 'repayment:LOC-ACTION',
      currentThreads: true
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ type: 'task.deleted', revision: 5 })
    expect(parseContentJson(rows[0]!.contenu)).toMatchObject({
      version: 2,
      task: { state: 'deleted' }
    })
  })

  it('retire une note en ajoutant note.withdrawn', () => {
    const message = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-MESSAGE',
      type: 'note.published',
      contenu: JSON.stringify({ version: 2, text: 'Message sensible' })
    })

    const withdrawn = patch_activity(ALICE, message.id, { operation: 'withdraw_note' })
    expect(withdrawn).toMatchObject({
      type: 'note.withdrawn',
      threadId: message.threadId,
      revision: 2
    })
    expect(parseContentJson(withdrawn.contenu)).toEqual({ version: 2 })
    expect(get_activity(message.id)).not.toBeNull()
  })

  it('refuse une tâche ouverte sans échéance', async () => {
    await seed_users(ALICE, BOB)
    expect(() =>
      create_activity(ALICE, {
        contexte: 'repayment',
        ref: 'LOC-NO-DUE',
        type: 'task.created',
        contenu: JSON.stringify({
          version: 2,
          task: {
            title: 'Sans date',
            state: 'open',
            assignee: { id: BOB, label: BOB }
          }
        })
      })
    ).toThrow(/due date/)
  })

  it('liste mes tâches et celles que j’ai assignées, triées par échéance', async () => {
    await seed_users(ALICE, BOB, CLAIRE)
    const mineLater = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-MINE-LATER',
      type: 'task.created',
      contenu: JSON.stringify({
        version: 2,
        task: {
          title: 'Plus tard',
          state: 'open',
          assignee: { id: ALICE, label: ALICE },
          due_date: '2026-09-10'
        }
      })
    })
    const mineSooner = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-MINE-SOONER',
      type: 'task.created',
      contenu: JSON.stringify({
        version: 2,
        task: {
          title: 'Plus tôt',
          state: 'open',
          assignee: { id: ALICE, label: ALICE },
          due_date: '2026-09-02'
        }
      })
    })
    const delegated = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-DELEGATED',
      type: 'task.created',
      contenu: JSON.stringify({
        version: 2,
        task: {
          title: 'Pour Bob',
          state: 'open',
          assignee: { id: BOB, label: BOB },
          due_date: '2026-09-05'
        }
      })
    })
    create_activity(BOB, {
      contexte: 'repayment',
      ref: 'LOC-BOB-OWN',
      type: 'task.created',
      contenu: JSON.stringify({
        version: 2,
        task: {
          title: 'À Bob par Bob',
          state: 'open',
          assignee: { id: BOB, label: BOB },
          due_date: '2026-09-01'
        }
      })
    })

    expect(
      list_activities(ALICE, {
        currentThreads: true,
        state: 'open',
        assignee: 'me',
        order: 'due_asc'
      }).map((row) => row.id)
    ).toEqual([mineSooner.id, mineLater.id])

    expect(
      list_activities(ALICE, {
        currentThreads: true,
        state: 'open',
        createdBy: 'me',
        assignee: 'other',
        order: 'due_asc'
      }).map((row) => row.id)
    ).toEqual([delegated.id])
  })

  it('autorise tout collaborateur à ignorer une tâche ouverte', async () => {
    await seed_users(ALICE, BOB, CLAIRE)
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-IGNORE',
      type: 'task.created',
      contenu: task_content()
    })

    const ignored = patch_activity(CLAIRE, created.id, {
      operation: 'ignore_action',
      motif: 'Plus nécessaire.'
    })

    expect(ignored).toMatchObject({
      auteur: user(CLAIRE),
      type: 'task.ignored',
      revision: 2
    })
    expect(parseContentJson(ignored.contenu)['reason']).toBe('Plus nécessaire.')
  })

  it('produit une enveloppe JSON autosuffisante pour un LLM', async () => {
    await seed_users(ALICE, BOB)
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-LLM',
      type: 'task.created',
      contenu: task_content()
    })
    const completed = patch_activity(BOB, created.id, {
      operation: 'complete_action',
      resultat: 'Promesse confirmée.'
    })
    const db = new Database(paths.database)
    const rows = db
      .query<{ activity: string }, [string]>(
        `SELECT json_object(
           'id', id,
           'occurred_at', date_creation,
           'actor', auteur,
           'type', type,
           'thread_id', thread_id,
           'revision', revision,
           'content', json(contenu)
         ) AS activity
         FROM activites
         WHERE rattachement = ?
         ORDER BY date_creation ASC, id ASC`
      )
      .all('repayment:LOC-LLM')
      .map((row) => JSON.parse(row.activity) as Record<string, unknown>)
    db.close()

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      actor: user(ALICE),
      type: 'task.created',
      thread_id: created.threadId,
      revision: 1
    })
    expect(rows[1]).toMatchObject({
      actor: user(BOB),
      type: 'task.completed',
      thread_id: created.threadId,
      revision: 2,
      content: {
        version: 2,
        task: { title: 'Contacter le garant', state: 'completed' },
        result: 'Promesse confirmée.'
      }
    })
    expect(completed.id).not.toBe(created.id)
  })
})
