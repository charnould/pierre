import { Database } from 'bun:sqlite'
import { describe, expect, it } from 'bun:test'

import { mention_of } from '../../../../shared/activites'
import { parse_contenu_json } from '../../../../shared/activites'
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
  CAROL,
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
  it('facette un ticket et résout @login + destinataires vers user:email', () => {
    seed_users(ALICE, JEAN, BOB, CLAIRE)
    const db = new Database(DATASTORE_PATH)
    db.run('CREATE TABLE reclamations (id_reclamation TEXT, id_locataire TEXT, id_lot TEXT)')
    db.run('CREATE TABLE lots_locatifs (id_lot TEXT, id_client TEXT)')
    db.run("INSERT INTO reclamations VALUES ('REQ-1', 'LOC-1', 'LOT-1')")
    db.run("INSERT INTO lots_locatifs VALUES ('LOT-1', 'CLI-1')")
    db.close()

    const created = create_activity(ALICE, {
      contexte: 'tickets',
      ref: 'REQ-1',
      type: 'note',
      statut: 'logged',
      recipients: ['jean.dupont', BOB],
      contenu: 'Point avec @claire'
    })
    expect(created).toMatchObject({
      rattachement: 'tickets:REQ-1',
      auteur: user(ALICE),
      id_client: 'CLI-1',
      id_locataire: 'LOC-1',
      id_lot: 'LOT-1',
      contenu: JSON.stringify({ version: 1, note: 'Point avec @claire' })
    })
    expect(created.mentions).toEqual([mention(CLAIRE), mention(JEAN), mention(BOB)])
    expect(list_activities(JEAN, { inbox: true })).toHaveLength(1)
    expect(list_activities('jean', { inbox: true })).toHaveLength(0)
    expect(list_activities(user(JEAN), { inbox: true })).toHaveLength(1)

    patch_activity(JEAN, created.id, { operation: 'set_mention', lu: true, boost: '🔥' })
    const after = list_activities(BOB, { inbox: true })[0]!
    expect(after.mentions).toEqual([mention(CLAIRE), mention(JEAN, true, '🔥'), mention(BOB)])
    expect(after.my).toEqual(mention(BOB))
  })

  it('ignore un @login inconnu et accepte un destinataire déjà préfixé', () => {
    seed_users(ALICE, BOB)
    const created = create_activity(ALICE, {
      contexte: 'tickets',
      ref: 'REQ-9',
      type: 'note',
      statut: 'logged',
      recipients: [user(BOB), 'ghost'],
      contenu: 'Vu @inconnu et @bob'
    })
    expect(created.mentions).toEqual([mention(BOB)])
  })

  it('résout @pierre vers l’agent avant un utilisateur homonyme', () => {
    seed_users(ALICE, 'pierre@exemple.fr')
    const created = create_activity(ALICE, {
      contexte: 'tickets',
      ref: 'REQ-AGENT',
      type: 'note',
      statut: 'logged',
      recipients: ['pierre'],
      contenu: 'Avis demandé à @pierre'
    })

    expect(created.mentions).toEqual([
      { destinataire: DESKTOP_AGENT_DESTINATAIRE, lu: false, boost: null }
    ])
    expect(list_activities(DESKTOP_AGENT_DESTINATAIRE, { inbox: true })).toHaveLength(1)
    expect(list_activities('pierre@exemple.fr', { inbox: true })).toHaveLength(0)
  })

  it('conserve l’auto-mention pour que l’auteur puisse se notifier', () => {
    seed_users(ADMIN)
    const db = new Database(DATASTORE_PATH)
    db.run('CREATE TABLE reclamations (id_reclamation TEXT, id_locataire TEXT, id_lot TEXT)')
    db.run("INSERT INTO reclamations VALUES ('REQ-2', 'LOC-2', NULL)")
    db.close()

    const created = create_activity(ADMIN, {
      contexte: 'repayment',
      ref: 'LOC-2',
      type: 'note',
      statut: 'logged',
      contenu: '@admin rappel perso'
    })

    expect(created.mentions).toEqual([mention(ADMIN)])
    expect(list_activities(ADMIN, { inbox: true })).toHaveLength(1)
    expect(list_activities(ADMIN, { inbox: true })[0]?.id).toBe(created.id)
  })

  it('régénère un brouillon courant sur place et réécrit le contenu', () => {
    const first = create_trusted_activity(ALICE, {
      contexte: 'tickets',
      ref: 'REQ-1',
      type: 'ticket_memo',
      statut: 'draft',
      contenu: JSON.stringify({ contenu: 'v1', evaluation: { score: 5 } }),
      auteur: 'agent:ticket.write-memo'
    })
    const regenerated = create_trusted_activity(ALICE, {
      contexte: 'tickets',
      ref: 'REQ-1',
      type: 'ticket_memo',
      statut: 'draft',
      contenu: JSON.stringify({ contenu: 'v2' }),
      auteur: 'agent:ticket.write-memo'
    })
    expect(regenerated.id).toBe(first.id)
    expect(parse_contenu_json(regenerated.contenu)).toEqual({ version: 1, contenu: 'v2' })
  })

  it('normalise un contenu textuel dans un JSON versionné', () => {
    const created = create_activity(ALICE, {
      contexte: 'automations',
      ref: 'auto-1',
      type: 'automation_report',
      statut: 'logged',
      contenu: '<h1>Rapport</h1><p>HTML brut</p>'
    })
    expect(parse_contenu_json(created.contenu)).toEqual({
      version: 1,
      contenu: '<h1>Rapport</h1><p>HTML brut</p>'
    })
  })

  it('refuse un auteur user: qui ne correspond pas à la session', () => {
    expect(
      CreateActivityInput.safeParse({
        contexte: 'tickets',
        ref: 'REQ-1',
        type: 'note',
        auteur: user(BOB),
        contenu: 'usurpation'
      }).success
    ).toBe(false)
  })

  it('crée ticket_reply et ticket_summary comme types structurés', () => {
    const reply = create_activity(ALICE, {
      contexte: 'automations',
      ref: 'auto-reply',
      type: 'ticket_reply',
      statut: 'logged',
      contenu: JSON.stringify({
        titre: 'Réponses',
        contenu: 'Brouillons',
        summary: { generated: 2, total: 3 }
      })
    })
    const summary = create_trusted_activity(ALICE, {
      contexte: 'tickets',
      ref: 'REQ-8',
      type: 'ticket_summary',
      statut: 'logged',
      contenu: JSON.stringify({ contenu: 'Point', skill: 'ticket.summarize-ticket' }),
      auteur: 'agent:ticket.summarize-ticket'
    })
    expect(reply.type).toBe('ticket_reply')
    expect(summary.type).toBe('ticket_summary')
    expect(typeof reply.id).toBe('number')
    expect(typeof summary.id).toBe('number')
  })
})

describe('latest_repayment_states', () => {
  it('projette la phase et la dernière action réalisée', () => {
    insert_repayment_activity('repayment_phase_change', 'LOC-1', '2026-06-10T10:00:00', {
      version: 1,
      phase_precedente: 'non_traites',
      phase: 'amiable'
    })
    insert_repayment_activity('action', 'LOC-1', '2026-06-11T11:00:00', {
      version: 1,
      action: 'Joindre le locataire',
      etat: 'fait'
    })
    const db = new Database(DATASTORE_PATH)
    db.run(
      `INSERT INTO activites (
         date_creation, rattachement, auteur, id_locataire, type, statut, mentions, contenu
       ) VALUES ('2026-06-12T12:00:00', 'repayment:LOC-1', ?, 'LOC-1', 'note', 'logged', '[]', 'Note')`,
      [user(ALICE)]
    )
    db.close()

    const states = latest_repayment_states(new Database(DATASTORE_PATH), ['LOC-1'])
    expect(states.get('LOC-1')).toEqual({
      bucket: 'amiable',
      derniere_action_realisee: 'Joindre le locataire',
      date_derniere_action_realisee: '2026-06-11T11:00:00',
      gestionnaire: null,
      gestionnaire_email: null
    })
  })

  it('ignore une note qui imite un changement d’action', () => {
    const db = new Database(DATASTORE_PATH)
    db.run(
      `INSERT INTO activites (
         date_creation, rattachement, auteur, id_locataire, type, statut, mentions, contenu
       ) VALUES ('2026-06-12T12:00:00', 'repayment:LOC-2', ?, 'LOC-2', 'note', 'logged', '[]',
         '{"contenu":"Note","action":"appel"}')`,
      [user(ALICE)]
    )
    db.close()

    const states = latest_repayment_states(new Database(DATASTORE_PATH), ['LOC-2'])
    expect(states.get('LOC-2')).toBeUndefined()
  })

  it('lit le dernier gestionnaire', () => {
    insert_repayment_activity('repayment_assignment', 'LOC-4', '2026-06-10T10:00:00', {
      version: 1,
      gestionnaire_precedent: null,
      gestionnaire: 'old@example.org'
    })
    insert_repayment_activity('repayment_assignment', 'LOC-4', '2026-06-11T11:00:00', {
      version: 1,
      gestionnaire_precedent: 'old@example.org',
      gestionnaire: CDUBOIS
    })

    const states = latest_repayment_states(new Database(DATASTORE_PATH), ['LOC-4'])
    expect(states.get('LOC-4')).toEqual({
      bucket: null,
      derniere_action_realisee: null,
      date_derniere_action_realisee: null,
      gestionnaire: CDUBOIS,
      gestionnaire_email: CDUBOIS
    })
  })

  it('ignore un changement de tags pour le listing', () => {
    insert_repayment_activity('repayment_phase_change', 'LOC-TAGS', '2026-06-10T10:00:00', {
      version: 1,
      phase_precedente: 'non_traites',
      phase: 'amiable'
    })
    insert_repayment_activity('repayment_tag_change', 'LOC-TAGS', '2026-06-12T12:00:00', {
      version: 1,
      tags_precedents: [],
      tags: ['décès']
    })

    const states = latest_repayment_states(new Database(DATASTORE_PATH), ['LOC-TAGS'])
    expect(states.get('LOC-TAGS')).toEqual({
      bucket: 'amiable',
      derniere_action_realisee: null,
      date_derniere_action_realisee: null,
      gestionnaire: null,
      gestionnaire_email: null
    })
    expect(states.get('LOC-TAGS')).not.toHaveProperty('tags')
  })

  it('un email entrant notifie le dernier gestionnaire affecté', () => {
    create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-5',
      type: 'repayment_assignment',
      statut: 'logged',
      recipients: [CDUBOIS],
      contenu: JSON.stringify({
        version: 1,
        gestionnaire_precedent: null,
        gestionnaire: CDUBOIS
      })
    })

    const inbound = create_inbound({
      contexte: 'repayment',
      ref: 'LOC-5',
      type: 'email',
      auteur: 'tenant:LOC-5',
      occurred_at: '2026-08-26T20:00:00Z',
      contenu: '{"version":1,"corps":"Réponse du locataire"}'
    })

    expect(inbound.mentions).toEqual([mention(CDUBOIS)])
  })
})

describe('patch_activity', () => {
  it('edit_content remplace un plan structuré et pose edition { par, le }', () => {
    const created = create_trusted_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-9',
      type: 'repayment_plan',
      statut: 'draft',
      contenu: JSON.stringify({
        version: 1,
        titre: "Plan d'apurement",
        etat: 'brouillon',
        formulaire: { rentalDebt: 100, signed: false },
        note: 'Ancien commentaire'
      }),
      auteur: 'agent:repayment.create-plan'
    })

    const updated = patch_activity(ALICE, created.id, {
      operation: 'edit_content',
      contenu: JSON.stringify({
        version: 1,
        titre: "Plan d'apurement",
        etat: 'brouillon',
        formulaire: { rentalDebt: 250, signed: false }
      })
    })

    const payload = parse_contenu_json(updated.contenu)
    expect(payload['titre']).toBe("Plan d'apurement")
    expect((payload['formulaire'] as { rentalDebt: number }).rentalDebt).toBe(250)
    expect(payload['note']).toBe('Ancien commentaire')
    expect(payload['edition']).toEqual({
      par: user(ALICE),
      le: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    })
  })

  it('edit_content d’une note met à jour le texte et fusionne les mentions', () => {
    seed_users(ALICE, BOB, CAROL)
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-11',
      type: 'note',
      statut: 'logged',
      contenu: JSON.stringify({ version: 1, note: 'Salut @bob' })
    })
    expect(created.mentions).toEqual([mention(BOB)])

    patch_activity(BOB, created.id, { operation: 'set_mention', lu: true, boost: '👍' })

    const updated = patch_activity(ALICE, created.id, {
      operation: 'edit_content',
      contenu: JSON.stringify({ version: 1, note: 'Salut @bob et @carol' })
    })

    expect(parse_contenu_json(updated.contenu)['note']).toBe('Salut @bob et @carol')
    expect(updated.mentions).toEqual([mention(BOB, true, '👍'), mention(CAROL)])
  })

  it('set_evaluation fonctionne sur tout contenu JSON structuré', () => {
    const note = create_activity(ALICE, {
      contexte: 'tickets',
      ref: 'REQ-3',
      type: 'note',
      statut: 'logged',
      contenu: JSON.stringify({ version: 1, note: 'Texte' })
    })
    expect(
      parse_contenu_json(
        patch_activity(ALICE, note.id, { operation: 'set_evaluation', score: 4 }).contenu
      )['evaluation']
    ).toMatchObject({ score: 4 })

    const memo = create_trusted_activity(ALICE, {
      contexte: 'tickets',
      ref: 'REQ-3',
      type: 'ticket_memo',
      statut: 'draft',
      contenu: JSON.stringify({ contenu: 'Mémo', skill: 'ticket.write-memo' }),
      auteur: 'agent:ticket.write-memo'
    })
    const evaluated = patch_activity(ALICE, memo.id, {
      operation: 'set_evaluation',
      score: 4,
      commentaire: 'Utile'
    })
    expect(parse_contenu_json(evaluated.contenu)['evaluation']).toEqual({
      score: 4,
      commentaire: 'Utile',
      par: user(ALICE),
      le: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    })
  })

  it('refuse un statut hors enum fermé', () => {
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-14',
      type: 'note',
      statut: 'logged',
      contenu: 'x'
    })
    expect(() =>
      patch_activity(ALICE, created.id, {
        operation: 'set_status',
        statut: 'non_respect' as never
      })
    ).toThrow()
  })

  it('inbox unread_only ne garde que lu: false', () => {
    seed_users(ALICE, BOB)
    const unread = create_activity(ALICE, {
      contexte: 'tickets',
      ref: 'REQ-4',
      type: 'note',
      statut: 'logged',
      recipients: [BOB],
      contenu: 'À lire'
    })
    const read = create_activity(ALICE, {
      contexte: 'tickets',
      ref: 'REQ-5',
      type: 'note',
      statut: 'logged',
      recipients: [BOB],
      contenu: 'Déjà vu'
    })
    patch_activity(BOB, read.id, { operation: 'set_mention', lu: true })
    const inbox = list_activities(BOB, { inbox: true, unread_only: true })
    expect(inbox.map((row) => row.id)).toEqual([unread.id])
    expect(inbox[0]?.my?.lu).toBe(false)
  })

  it('filtre l’activité par plusieurs auteurs sans exposer leur inbox', () => {
    seed_users(ALICE, BOB, CLAIRE)
    const alice = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-ALICE',
      type: 'repayment_phase_change',
      statut: 'logged',
      contenu: JSON.stringify({ version: 1, phase_precedente: 'nouveau', phase: 'relance' })
    })
    const bob = create_activity(BOB, {
      contexte: 'tickets',
      ref: 'REC-BOB',
      type: 'ticket_change',
      statut: 'logged',
      recipients: [CLAIRE],
      contenu: JSON.stringify({ avant: 'ouvert', apres: 'clos' })
    })
    create_activity(CLAIRE, {
      contexte: 'tickets',
      ref: 'REC-CLAIRE',
      type: 'note',
      statut: 'logged',
      contenu: 'Hors sélection'
    })

    const activity = list_activities(CLAIRE, {
      auteurs: [user(ALICE), user(BOB)]
    })

    expect(activity.map((row) => row.id)).toEqual([bob.id, alice.id])
    expect(activity[0]?.my).toEqual(mention(CLAIRE))
    expect(activity.every((row) => [user(ALICE), user(BOB)].includes(row.auteur))).toBe(true)
  })
})

describe('delete_activity', () => {
  it('autorise le créateur à hard-deleter une note', () => {
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-12',
      type: 'note',
      statut: 'logged',
      contenu: 'À supprimer'
    })

    delete_activity(ALICE, created.id)
    expect(get_activity(created.id)).toBeNull()
  })

  it('refuse la suppression d’une note par un non-auteur', () => {
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-13',
      type: 'note',
      statut: 'logged',
      contenu: 'Privé'
    })

    expect(() => delete_activity(BOB, created.id)).toThrow()
    expect(get_activity(created.id)?.id).toBe(created.id)
  })

  it('supprime aussi les boosts liés à une note', () => {
    seed_users(ALICE, BOB)
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-12-BOOST',
      type: 'note',
      statut: 'logged',
      contenu: 'À booster'
    })
    patch_activity(BOB, created.id, { operation: 'set_boost', emoji: '👍' })
    const boost = list_activities(ALICE, { inbox: true })[0]
    expect(boost?.type).toBe('activity_boost')

    delete_activity(ALICE, created.id)
    expect(get_activity(created.id)).toBeNull()
    expect(boost ? get_activity(boost.id) : null).toBeNull()
    expect(list_activities(ALICE, { inbox: true })).toHaveLength(0)
  })

  it('refuse la suppression d’une todo par un non-créateur', () => {
    seed_users(ALICE, BOB)
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-TODO-FORBID',
      type: 'action',
      contenu: JSON.stringify({
        version: 1,
        action: 'Relancer',
        etat: 'a_faire',
        assigne_a: BOB,
        date_echeance: '2026-08-30'
      })
    })

    expect(() => delete_activity(BOB, created.id)).toThrow(/Forbidden/)
    expect(get_activity(created.id)?.id).toBe(created.id)
  })

  it('supprime un brouillon de plan mais conserve un plan signé', () => {
    const draft = create_trusted_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-10',
      type: 'repayment_plan',
      statut: 'draft',
      contenu: JSON.stringify({
        version: 1,
        titre: "Plan d'apurement",
        etat: 'brouillon',
        formulaire: { rentalDebt: 100, signed: false }
      }),
      auteur: 'agent:repayment.create-plan'
    })

    delete_activity(ALICE, draft.id)
    expect(get_activity(draft.id)).toBeNull()

    const signed = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-10',
      type: 'repayment_plan',
      statut: 'logged',
      contenu: JSON.stringify({ version: 1, etat: 'signe', formulaire: { signed: true } })
    })
    expect(() => delete_activity(ALICE, signed.id)).toThrow()
  })
})

describe('set_boost', () => {
  it('autorise un boost sans mention préalable et notifie l’auteur', () => {
    seed_users(ALICE, BOB)
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-BOOST',
      type: 'note',
      statut: 'logged',
      contenu: 'Relance effectuée'
    })

    const updated = patch_activity(BOB, created.id, { operation: 'set_boost', emoji: '👍' })
    expect(updated.mentions).toEqual([
      { destinataire: user(BOB), lu: true, boost: '👍', inbox: false }
    ])
    expect(list_activities(BOB, { inbox: true })).toHaveLength(0)

    const inbox = list_activities(ALICE, { inbox: true })
    expect(inbox).toHaveLength(1)
    expect(inbox[0]?.type).toBe('activity_boost')
    expect(inbox[0]?.auteur).toBe(user(BOB))
    expect(inbox[0]?.my).toEqual({ destinataire: user(ALICE), lu: false, boost: null })
    expect(parse_contenu_json(inbox[0]!.contenu)).toEqual({
      version: 1,
      activite_source_id: created.id,
      type_activite_source: 'note',
      emoji: '👍'
    })
  })

  it('remplace l’emoji et recrée une notification non lue', () => {
    seed_users(ALICE, BOB)
    const created = create_activity(ALICE, {
      contexte: 'tickets',
      ref: 'REQ-BOOST',
      type: 'note',
      statut: 'logged',
      contenu: 'Point'
    })
    patch_activity(BOB, created.id, { operation: 'set_boost', emoji: '👍' })
    const first = list_activities(ALICE, { inbox: true })[0]!
    patch_activity(ALICE, first.id, { operation: 'set_mention', lu: true })

    patch_activity(BOB, created.id, { operation: 'set_boost', emoji: '🔥' })
    const source = get_activity(created.id)!
    expect(mention_of(source.mentions, user(BOB))?.boost).toBe('🔥')

    const inbox = list_activities(ALICE, { inbox: true })
    expect(inbox).toHaveLength(1)
    expect(inbox[0]?.id).toBe(first.id)
    expect(inbox[0]?.my?.lu).toBe(false)
    expect(parse_contenu_json(inbox[0]!.contenu)['emoji']).toBe('🔥')
  })

  it('retire le boost et supprime la notification, sans polluer l’inbox du booster', () => {
    seed_users(ALICE, BOB)
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-BOOST-2',
      type: 'repayment_phase_change',
      statut: 'logged',
      contenu: JSON.stringify({
        version: 1,
        phase_precedente: 'amiable',
        phase: 'pre_contentieux'
      })
    })
    patch_activity(BOB, created.id, { operation: 'set_boost', emoji: '👏' })
    patch_activity(BOB, created.id, { operation: 'set_boost', emoji: null })

    expect(get_activity(created.id)?.mentions).toEqual([])
    expect(list_activities(ALICE, { inbox: true })).toHaveLength(0)
    expect(list_activities(BOB, { inbox: true })).toHaveLength(0)
  })

  it('conserve une mention réelle et son état lu quand on boost puis retire', () => {
    seed_users(ALICE, BOB)
    const created = create_activity(ALICE, {
      contexte: 'tickets',
      ref: 'REQ-BOOST-2',
      type: 'note',
      statut: 'logged',
      recipients: [BOB],
      contenu: 'Salut @bob'
    })
    patch_activity(BOB, created.id, { operation: 'set_mention', lu: true })
    patch_activity(BOB, created.id, { operation: 'set_boost', emoji: '❤️' })
    expect(list_activities(BOB, { inbox: true })).toHaveLength(1)

    patch_activity(BOB, created.id, { operation: 'set_boost', emoji: null })
    const source = get_activity(created.id)!
    expect(mention_of(source.mentions, user(BOB))).toEqual(mention(BOB, true, null))
    expect(list_activities(BOB, { inbox: true })[0]?.id).toBe(created.id)
  })

  it('refuse l’auto-boost, les auteurs non collaborateurs et le boost d’une notification', () => {
    seed_users(ALICE, BOB)
    const own = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-BOOST-3',
      type: 'note',
      statut: 'logged',
      contenu: 'Moi'
    })
    expect(() => patch_activity(ALICE, own.id, { operation: 'set_boost', emoji: '👍' })).toThrow(
      ActivitiesError
    )

    const agent = create_trusted_activity(ALICE, {
      contexte: 'tickets',
      ref: 'REQ-BOT',
      type: 'ticket_memo',
      statut: 'logged',
      contenu: JSON.stringify({ contenu: 'Mémo' }),
      auteur: 'agent:ticket.write-memo'
    })
    expect(() => patch_activity(BOB, agent.id, { operation: 'set_boost', emoji: '👍' })).toThrow(
      /collaborator/
    )

    patch_activity(BOB, own.id, { operation: 'set_boost', emoji: '👍' })
    const notification = list_activities(ALICE, { inbox: true })[0]!
    expect(() =>
      patch_activity(BOB, notification.id, { operation: 'set_boost', emoji: '👏' })
    ).toThrow(/cannot be boosted/i)
  })

  it('autorise le boost d’un courrier de masse et refuse d’en modifier le contenu', () => {
    seed_users(ALICE, BOB)
    const db = new Database(DATASTORE_PATH)
    const inserted = db.run(
      `INSERT INTO activites (
         date_creation, date_statut, rattachement, auteur, id_locataire, type, statut,
         mentions, contenu, thread_id, bulk_id
       ) VALUES (
         '2026-08-30T10:00:00', '2026-08-30T10:00:00', 'repayment:LOC-BULK-R1',
         ?, 'LOC-BULK-R1', 'courrier', 'sent', '[]', ?, ?, ?
       )`,
      [
        user(ALICE),
        JSON.stringify({ version: 1, canal: 'courrier', action: 'Envoyer le courrier R1' }),
        Bun.randomUUIDv7(),
        'bulk-r1'
      ]
    )
    const sourceId = Number(inserted.lastInsertRowid)
    db.close()
    expect(sourceId).toBeGreaterThan(0)

    const updated = patch_activity(BOB, sourceId, { operation: 'set_boost', emoji: '👏' })
    expect(updated.type).toBe('courrier')
    expect(updated.bulk_id).toBe('bulk-r1')
    expect(updated.mentions).toEqual([
      { destinataire: user(BOB), lu: true, boost: '👏', inbox: false }
    ])

    const inbox = list_activities(ALICE, { inbox: true })
    expect(inbox).toHaveLength(1)
    expect(inbox[0]?.type).toBe('activity_boost')
    expect(parse_contenu_json(inbox[0]!.contenu)).toMatchObject({
      activite_source_id: sourceId,
      type_activite_source: 'courrier',
      emoji: '👏'
    })

    expect(() =>
      patch_activity(BOB, sourceId, { operation: 'edit_content', contenu: 'autre texte' })
    ).toThrow(/immutable/i)

    patch_activity(BOB, sourceId, { operation: 'set_boost', emoji: null })
    expect(get_activity(sourceId)?.mentions).toEqual([])
    expect(list_activities(ALICE, { inbox: true })).toHaveLength(0)
  })

  it('refuse la création directe d’une activity_boost', () => {
    expect(() =>
      create_activity(BOB, {
        contexte: 'repayment',
        ref: 'LOC-X',
        type: 'activity_boost',
        statut: 'logged',
        recipients: [ALICE],
        contenu: JSON.stringify({
          version: 1,
          activite_source_id: 1,
          type_activite_source: 'note',
          emoji: '👍'
        })
      })
    ).toThrow(/directly/)
  })
})
