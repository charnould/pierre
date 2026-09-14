import { Database } from 'bun:sqlite'
import { describe, expect, it } from 'bun:test'

import { parse_contenu_json } from '../../../../shared/activites'
import { list_activities } from '../../../utils/activities/query'
import { get_activity } from '../../../utils/activities/rows'
import { create_activity, delete_activity, patch_activity } from '../../../utils/activities/write'
import { datastorePaths } from '../../../utils/paths'
import {
  ALICE,
  BOB,
  CLAIRE,
  mention,
  seed_users,
  use_activities_test_env,
  user
} from './activities-test-env'

const SERVICE = '_test_action_lifecycle'
use_activities_test_env(SERVICE)

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
  it('planifie, réalise, replanifie puis ignore une tâche append-only', () => {
    seed_users(ALICE, BOB, CLAIRE)
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
        current_threads: true,
        state: 'open'
      }).map((row) => row.id)
    ).toEqual([created.id])
    expect(created.mentions).toContainEqual(mention(BOB, 'assignation'))

    const completed = patch_activity(CLAIRE, created.id, {
      operation: 'complete_action',
      resultat: 'Garant joint.'
    })
    expect(parse_contenu_json(completed.contenu)).toMatchObject({
      version: 2,
      task: { state: 'completed' },
      result: 'Garant joint.'
    })
    expect(completed).toMatchObject({
      auteur: user(CLAIRE),
      type: 'task.completed',
      thread_id: created.thread_id,
      revision: 2
    })
    expect(get_activity(created.id)?.contenu).toBe(createdContent)

    expect(() =>
      patch_activity(ALICE, created.id, {
        operation: 'reopen_action',
        assigne_a: BOB,
        date_echeance: '2026-09-02'
      })
    ).toThrow(/changed since it was loaded/)

    const reopened = patch_activity(ALICE, completed.id, {
      operation: 'reopen_action',
      assigne_a: BOB,
      date_echeance: '2026-09-02'
    })
    expect(parse_contenu_json(reopened.contenu)).toMatchObject({
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
    expect(parse_contenu_json(ignored.contenu)).toMatchObject({
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
        current_threads: true
      }).map((row) => row.id)
    ).toEqual([ignored.id])

    delete_activity(ALICE, ignored.id)
    const rows = list_activities(ALICE, {
      rattachement: 'repayment:LOC-ACTION',
      current_threads: true
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ type: 'task.deleted', revision: 5 })
    expect(parse_contenu_json(rows[0]!.contenu)).toMatchObject({
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
      thread_id: message.thread_id,
      revision: 2
    })
    expect(parse_contenu_json(withdrawn.contenu)).toEqual({ version: 2 })
    expect(get_activity(message.id)).not.toBeNull()
  })

  it('autorise tout collaborateur à ignorer une tâche ouverte', () => {
    seed_users(ALICE, BOB, CLAIRE)
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
    expect(parse_contenu_json(ignored.contenu)['reason']).toBe('Plus nécessaire.')
  })

  it('produit une enveloppe JSON autosuffisante pour un LLM', () => {
    seed_users(ALICE, BOB)
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
    const db = new Database(datastorePaths(SERVICE).database)
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
      thread_id: created.thread_id,
      revision: 1
    })
    expect(rows[1]).toMatchObject({
      actor: user(BOB),
      type: 'task.completed',
      thread_id: created.thread_id,
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
