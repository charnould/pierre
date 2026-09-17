import { Database } from 'bun:sqlite'
import { describe, expect, it } from 'bun:test'

import { mention_of, parse_contenu_json } from '../../../../shared/activites'
import { DESKTOP_AGENT_DESTINATAIRE } from '../../../../shared/agent-identity'
import { list_activities } from '../../../utils/activities/query'
import { latest_repayment_states } from '../../../utils/activities/repayment'
import { get_activity } from '../../../utils/activities/rows'
import { ActivitiesError, CreateActivityInput } from '../../../utils/activities/schema'
import {
  create_activity,
  create_trusted_activity,
  delete_activity,
  patch_activity
} from '../../../utils/activities/write'
import { create_inbound } from '../../../utils/communications/storage'
import {
  ADMIN,
  ALICE,
  BOB,
  CDUBOIS,
  CLAIRE,
  DATASTORE_PATH,
  insert_repayment_activity,
  JEAN,
  mention,
  seed_users,
  use_activities_test_env,
  user
} from './activities-test-env'

use_activities_test_env()

describe('create_activity', () => {
  it('facette un ticket et résout @login + destinataires vers user:email', async () => {
    await seed_users(ALICE, JEAN, BOB, CLAIRE)
    const db = new Database(DATASTORE_PATH)
    db.run('CREATE TABLE reclamations (id_reclamation TEXT, id_locataire TEXT, id_lot TEXT)')
    db.run('CREATE TABLE lots_locatifs (id_lot TEXT, id_client TEXT)')
    db.run("INSERT INTO reclamations VALUES ('REQ-1', 'LOC-1', 'LOT-1')")
    db.run("INSERT INTO lots_locatifs VALUES ('LOT-1', 'CLI-1')")
    db.close()

    const created = create_activity(ALICE, {
      contexte: 'tickets',
      ref: 'REQ-1',
      type: 'note.published',
      recipients: ['jean.dupont', BOB],
      contenu: JSON.stringify({ version: 2, text: 'Point avec @claire' })
    })
    expect(created).toMatchObject({
      rattachement: 'tickets:REQ-1',
      auteur: user(ALICE),
      id_client: 'CLI-1',
      id_locataire: 'LOC-1',
      id_lot: 'LOT-1',
      type: 'note.published',
      channel: null
    })
    expect(parse_contenu_json(created.contenu)).toEqual({
      version: 2,
      text: 'Point avec @claire'
    })
    expect(created.mentions).toEqual([mention(CLAIRE), mention(JEAN), mention(BOB)])
    expect(list_activities(JEAN, { inbox: true })).toHaveLength(1)
    expect(list_activities('jean', { inbox: true })).toHaveLength(0)

    patch_activity(JEAN, created.id, { operation: 'set_mention', lu: true })
    const after = list_activities(JEAN, { inbox: true })[0]!
    expect(after.my).toEqual(mention(JEAN))
    expect(after.read).toBe(true)
    expect(list_activities(JEAN, { inbox: true, unread_only: true })).toHaveLength(0)

    const unreadEvent = patch_activity(JEAN, created.id, { operation: 'set_mention', lu: false })
    expect(unreadEvent.type).toBe('activity.unread')
    expect(list_activities(JEAN, { inbox: true })[0]?.read).toBe(false)
    expect(list_activities(JEAN, { inbox: true, unread_only: true }).map((row) => row.id)).toEqual([
      created.id
    ])

    const unreadAgain = patch_activity(JEAN, created.id, { operation: 'set_mention', lu: false })
    expect(unreadAgain.id).toBe(created.id)
    expect(unreadAgain.type).toBe('note.published')
  })

  it('ignore un @login inconnu et résout @pierre vers l’agent', async () => {
    await seed_users(ALICE, BOB, 'pierre@exemple.fr')
    const created = create_activity(ALICE, {
      contexte: 'tickets',
      ref: 'REQ-AGENT',
      type: 'note.published',
      recipients: [user(BOB), 'ghost', 'pierre'],
      contenu: JSON.stringify({ version: 2, text: 'Vu @inconnu et @bob et @pierre' })
    })
    expect(created.mentions).toEqual([mention(BOB), { destinataire: DESKTOP_AGENT_DESTINATAIRE }])
    expect(list_activities(DESKTOP_AGENT_DESTINATAIRE, { inbox: true })).toHaveLength(1)
    expect(list_activities('pierre@exemple.fr', { inbox: true })).toHaveLength(0)
  })

  it('conserve l’auto-mention et refuse les payloads v1', async () => {
    await seed_users(ADMIN)
    const created = create_activity(ADMIN, {
      contexte: 'repayment',
      ref: 'LOC-2',
      type: 'note.published',
      contenu: JSON.stringify({ version: 2, text: '@admin rappel perso' })
    })
    expect(created.mentions).toEqual([mention(ADMIN)])
    expect(list_activities(ADMIN, { inbox: true })[0]?.id).toBe(created.id)

    expect(() =>
      create_activity(ALICE, {
        contexte: 'automations',
        ref: 'auto-1',
        type: 'automation.reported',
        contenu: JSON.stringify({ version: 1, contenu: '<h1>Rapport</h1>' })
      })
    ).toThrow(/Invalid automation\.reported content/)
  })

  it('valide les types fermés et les auteurs fiables', () => {
    expect(
      CreateActivityInput.safeParse({
        contexte: 'tickets',
        ref: 'REQ-1',
        type: 'note',
        contenu: JSON.stringify({ version: 2, text: 'ancien alias' })
      }).success
    ).toBe(false)
    const generated = create_trusted_activity(ALICE, {
      contexte: 'tickets',
      ref: 'REQ-1',
      type: 'artifact.generated',
      contenu: JSON.stringify({ version: 2, title: 'Mémo', note: 'Contenu' }),
      auteur: 'agent:ticket.write-memo'
    })
    expect(generated).toMatchObject({
      type: 'artifact.generated',
      auteur: 'agent:ticket.write-memo',
      revision: 1
    })
  })
})

describe('latest_repayment_states', () => {
  it('projette le groupe, la dernière tâche réalisée et le gestionnaire', () => {
    insert_repayment_activity('case.group_changed', 'LOC-1', '2026-06-10T10:00:00Z', {
      version: 2,
      before: 'non_traites',
      after: 'amiable'
    })
    insert_repayment_activity('case.assignee_changed', 'LOC-1', '2026-06-10T11:00:00Z', {
      version: 2,
      before: null,
      after: { id: user(CDUBOIS), label: CDUBOIS }
    })
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-1',
      type: 'task.created',
      contenu: JSON.stringify({
        version: 2,
        task: {
          title: 'Joindre le locataire',
          state: 'open',
          assignee: { id: ALICE, label: ALICE }
        }
      })
    })
    patch_activity(ALICE, created.id, {
      operation: 'complete_action',
      resultat: 'Locataire joint'
    })

    const db = new Database(DATASTORE_PATH)
    const states = latest_repayment_states(db, ['LOC-1'])
    db.close()
    expect(states.get('LOC-1')).toMatchObject({
      bucket: 'amiable',
      derniere_action_realisee: 'Joindre le locataire',
      gestionnaire: CDUBOIS,
      gestionnaire_email: CDUBOIS
    })
  })

  it('ignore les autres rattachements et notifie le gestionnaire sur un entrant', () => {
    insert_repayment_activity('case.assignee_changed', 'LOC-5', '2026-06-10T10:00:00Z', {
      version: 2,
      before: null,
      after: { id: user(CDUBOIS), label: CDUBOIS }
    })
    const db = new Database(DATASTORE_PATH)
    db.run(
      `INSERT INTO activites (
         date_creation, rattachement, auteur, id_locataire, type, mentions, contenu
       ) VALUES (
         '2099-08-26T19:00:00Z', 'tickets:REQ-5', 'system:test', 'LOC-5',
         'case.assignee_changed', '[]',
         '{"version":2,"before":null,"after":"wrong@example.org"}'
       )`
    )
    db.close()

    const inbound = create_inbound({
      contexte: 'repayment',
      ref: 'LOC-5',
      type: 'email',
      auteur: 'tenant:LOC-5',
      occurred_at: '2026-08-26T20:00:00Z',
      contenu: JSON.stringify({ version: 2, sender: 'tenant:LOC-5', body: 'Réponse' })
    })
    expect(inbound.mentions).toEqual([mention(CDUBOIS)])
  })
})

describe('append-only patches', () => {
  it('édite une note dans son thread et conserve la version publiée', async () => {
    await seed_users(ALICE, BOB)
    const created = create_activity(ALICE, {
      contexte: 'tickets',
      ref: 'REQ-EDIT',
      type: 'note.published',
      contenu: JSON.stringify({ version: 2, text: 'Salut @bob' })
    })
    const updated = patch_activity(ALICE, created.id, {
      operation: 'edit_content',
      contenu: JSON.stringify({ version: 2, text: 'Bonjour @bob' })
    })
    expect(updated).toMatchObject({
      type: 'note.updated',
      thread_id: created.thread_id,
      revision: 2
    })
    expect(parse_contenu_json(updated.contenu)).toEqual({ version: 2, text: 'Bonjour @bob' })
    expect(get_activity(created.id)?.contenu).toBe(created.contenu)
  })

  it('projette lecture et réaction sans muter la source', async () => {
    await seed_users(ALICE, BOB)
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-REACTION',
      type: 'note.published',
      recipients: [BOB],
      contenu: JSON.stringify({ version: 2, text: 'Relance effectuée' })
    })
    patch_activity(BOB, created.id, { operation: 'set_mention', lu: true })
    const reaction = patch_activity(BOB, created.id, { operation: 'set_boost', emoji: '👍' })
    expect(reaction.type).toBe('activity.reaction_changed')
    expect(parse_contenu_json(reaction.contenu)).toEqual({
      version: 2,
      source_activity_id: created.id,
      emoji: '👍'
    })
    const source = list_activities(BOB, { rattachement: created.rattachement }).find(
      (row) => row.id === created.id
    )!
    expect(source.read).toBe(true)
    expect(source.reaction).toBe('👍')
    expect(mention_of(source.mentions, user(BOB))).toEqual(mention(BOB))
  })

  it('retire une note par événement et refuse auteur étranger ou auto-réaction', () => {
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-WITHDRAW',
      type: 'note.published',
      contenu: JSON.stringify({ version: 2, text: 'Privé' })
    })
    expect(() => delete_activity(BOB, created.id)).toThrow(ActivitiesError)
    expect(() =>
      patch_activity(ALICE, created.id, { operation: 'set_boost', emoji: '👍' })
    ).toThrow(ActivitiesError)
    delete_activity(ALICE, created.id)
    const rows = list_activities(ALICE, { rattachement: created.rattachement })
    expect(rows.map((row) => row.type)).toEqual(['note.withdrawn', 'note.published'])
  })
})
