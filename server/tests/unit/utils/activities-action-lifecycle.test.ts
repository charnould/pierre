import { Database } from 'bun:sqlite'
import { describe, expect, it } from 'bun:test'

import { parse_contenu_json } from '../../../../shared/activites'
import { list_activities } from '../../../utils/activities/query'
import { get_activity } from '../../../utils/activities/rows'
import { create_activity, delete_activity, patch_activity } from '../../../utils/activities/write'
import {
  ALICE,
  BOB,
  CLAIRE,
  DATASTORE_PATH,
  seed_users,
  use_activities_test_env,
  user
} from './activities-test-env'

use_activities_test_env()

describe('action lifecycle', () => {
  it('planifie, réalise, replanifie puis ignore une action selon les permissions', () => {
    seed_users(ALICE, BOB, CLAIRE)
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-ACTION',
      type: 'action',
      contenu: JSON.stringify({
        version: 1,
        action: 'Contacter le garant',
        etat: 'a_faire',
        assigne_a: BOB,
        date_echeance: '2026-08-30',
        note: 'Premier contact.'
      })
    })
    const createdContent = created.contenu

    expect(created).toMatchObject({
      event: 'created',
      state: 'a_faire',
      revision: 1
    })
    expect(
      list_activities(ALICE, {
        rattachement: 'repayment:LOC-ACTION',
        type: 'action',
        current_threads: true,
        state: 'a_faire'
      }).map((row) => row.id)
    ).toEqual([created.id])
    expect(created.mentions).toContainEqual({
      destinataire: user(BOB),
      lu: false,
      boost: null,
      motif: 'assignation'
    })

    const completed = patch_activity(CLAIRE, created.id, {
      operation: 'complete_action',
      resultat: 'Garant joint.'
    })
    expect(parse_contenu_json(completed.contenu)).toMatchObject({
      etat: 'fait',
      resultat: 'Garant joint.'
    })
    expect(completed).toMatchObject({
      auteur: user(CLAIRE),
      thread_id: created.thread_id,
      event: 'completed',
      state: 'fait',
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
      etat: 'a_faire',
      assigne_a: user(BOB),
      date_echeance: '2026-09-02'
    })

    const ignored = patch_activity(ALICE, reopened.id, {
      operation: 'ignore_action',
      motif: 'Sans objet.'
    })
    expect(parse_contenu_json(ignored.contenu)).toMatchObject({
      etat: 'ignore',
      motif: 'Sans objet.'
    })
    expect(ignored).toMatchObject({
      auteur: user(ALICE),
      event: 'ignored',
      state: 'ignore',
      revision: 4
    })
    expect(
      list_activities(ALICE, {
        rattachement: 'repayment:LOC-ACTION',
        type: 'action',
        current_threads: true
      }).map((row) => row.id)
    ).toEqual([ignored.id])
    delete_activity(ALICE, completed.id)
    expect(get_activity(created.id)).toBeNull()
    expect(get_activity(completed.id)).toBeNull()
    expect(get_activity(reopened.id)).toBeNull()
    expect(get_activity(ignored.id)).toBeNull()
  })

  it('retire le contenu d’une note sans supprimer son activité', () => {
    const message = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-MESSAGE',
      type: 'note',
      statut: 'logged',
      contenu: JSON.stringify({ version: 1, note: 'Message sensible' })
    })

    const withdrawn = patch_activity(ALICE, message.id, { operation: 'withdraw_note' })
    expect(parse_contenu_json(withdrawn.contenu)).toMatchObject({
      version: 1,
      note: '',
      etat: 'retire',
      retire_par: user(ALICE)
    })
    expect(get_activity(message.id)).not.toBeNull()
  })

  it('autorise tout collaborateur à ignorer une todo ouverte', () => {
    seed_users(ALICE, BOB, CLAIRE)
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-IGNORE',
      type: 'action',
      contenu: JSON.stringify({
        version: 1,
        action: 'Relancer',
        etat: 'a_faire',
        assigne_a: BOB,
        date_echeance: '2026-08-30'
      })
    })

    const ignored = patch_activity(CLAIRE, created.id, {
      operation: 'ignore_action',
      motif: 'Plus nécessaire.'
    })

    expect(ignored).toMatchObject({
      auteur: user(CLAIRE),
      event: 'ignored',
      state: 'ignore',
      revision: 2
    })
    expect(parse_contenu_json(ignored.contenu)['motif']).toBe('Plus nécessaire.')
  })

  it('produit une enveloppe JSON autosuffisante pour un LLM', () => {
    seed_users(ALICE, BOB)
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-LLM',
      type: 'action',
      contenu: JSON.stringify({
        version: 1,
        action: 'Appeler le locataire',
        etat: 'a_faire',
        assigne_a: BOB,
        date_echeance: '2026-08-30'
      })
    })
    const completed = patch_activity(BOB, created.id, {
      operation: 'complete_action',
      resultat: 'Promesse confirmée.'
    })
    const db = new Database(DATASTORE_PATH)
    const rows = db
      .query<{ activity: string }, [string]>(
        `SELECT json_object(
           'id', id,
           'occurred_at', date_creation,
           'actor', auteur,
           'type', type,
           'event', event,
           'state', state,
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
      event: 'created',
      state: 'a_faire',
      thread_id: created.thread_id,
      revision: 1
    })
    expect(rows[1]).toMatchObject({
      actor: user(BOB),
      event: 'completed',
      state: 'fait',
      thread_id: created.thread_id,
      revision: 2,
      content: {
        version: 1,
        action: 'Appeler le locataire',
        etat: 'fait',
        cree_par: user(ALICE),
        resultat: 'Promesse confirmée.'
      }
    })
    expect(completed.id).not.toBe(created.id)
  })
})
