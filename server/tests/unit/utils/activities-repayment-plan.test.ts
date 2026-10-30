import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { parseRepaymentPlanContent } from '../../../../shared/repayment-plan'
import { createActivity as postActivity } from '../../../routes/activities'
import type { User } from '../../../utils/_schema'
import { list_activities } from '../../../utils/activities/query'
import { create_activity, patch_activity } from '../../../utils/activities/write'
import { setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'

const paths = testDatastorePaths('repayment_plan_activities')
const DATABASE = paths.database
const ALICE = 'alice@example.org'

const plan_content = (adults = 1): string =>
  JSON.stringify({
    identification: {
      identifiant_client: 'CLI-1',
      identifiant_locataire: 'LOC-1',
      identifiant_logement: null,
      adresse: { voie: null, code_postal: null, commune: null }
    },
    dette: {
      montant_restant_du_euros: 1200,
      date_premier_loyer_impaye: null,
      motifs_impaye: [],
      ancienne_dette_locative_euros: null
    },
    procedure: {
      stade: null,
      date_du_stade: null,
      situation_banque_de_france: null,
      date_fin_moratoire: null
    },
    accompagnement: {
      visite_a_domicile: false,
      travailleur_social: null,
      date_saisine_ccapex_prevention_expulsions: null,
      date_saisine_ctesi_situations_individuelles: null,
      aides_mobilisables: []
    },
    bail: {
      avenant_signe: false,
      date_depot_preavis_conge: null,
      contentieux_anterieur_sur_ce_contrat: false,
      garant: null
    },
    foyer: {
      adultes: Array.from({ length: adults }, () => ({
        prenom: 'Alice',
        nom: 'Martin',
        date_naissance: null,
        type_emploi: null,
        employeur: null,
        numero_allocataire_caf: null,
        titulaire_du_bail: true,
        occupant_du_logement: true
      })),
      enfants: [{ prenom: 'Lina', nom: 'Martin', date_naissance: null, a_charge: true }]
    },
    budget: {
      ressources_mensuelles: [],
      ressources_ponctuelles: [],
      loyer_charges_moins_aides_au_logement_euros: null,
      charges_mensuelles: [],
      charges_ponctuelles: []
    },
    echeancier: {
      propose: true,
      echeances: [{ date_echeance: '2026-11-05', mensualite_euros: 150 }]
    }
  })

const thread_rows = (threadId: string) =>
  list_activities(ALICE, { rattachement: 'repayment:LOC-1', limit: 100 })
    .filter((row) => row.threadId === threadId)
    .sort((a, b) => a.id - b.id)

const snapshots = (threadId: string) =>
  thread_rows(threadId).filter(
    (row) => parseRepaymentPlanContent(row.type, row.contenu)?.foyer != null
  )

beforeAll(() => {
  setDatastoreRoot(paths.root)
})

afterAll(async () => {
  await rm(paths.root, { recursive: true, force: true })
  setDatastoreRoot(null)
})

beforeEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
  await setup()
})

describe('repayment plan activity lifecycle', () => {
  it('keeps one dossier through create and update', () => {
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-1',
      type: 'repayment_plan.created',
      contenu: plan_content(1)
    })
    expect(created.revision).toBeNull()
    expect(created.threadId).toBeTruthy()
    expect(snapshots(created.threadId!)).toHaveLength(1)
    expect(parseRepaymentPlanContent(created.type, created.contenu)?.foyer).toMatchObject({
      adultes: [{ prenom: 'Alice' }],
      enfants: [{ prenom: 'Lina' }]
    })

    const updated = patch_activity(ALICE, created.id, {
      operation: 'save_repayment_plan',
      contenu: plan_content(2)
    })
    expect(updated.type).toBe('repayment_plan.updated')
    expect(updated.threadId).toBe(created.threadId)
    expect(snapshots(created.threadId!).map((row) => row.id)).toEqual([updated.id])
    const stored = parseRepaymentPlanContent(updated.type, updated.contenu)
    expect(stored?.foyer).toMatchObject({
      adultes: [{ prenom: 'Alice' }, { prenom: 'Alice' }],
      enfants: [{ prenom: 'Lina' }]
    })
    expect(stored?.echeancier).toMatchObject({
      echeances: [{ date_echeance: '2026-11-05', mensualite_euros: 150 }]
    })
    expect(
      parseRepaymentPlanContent(created.type, thread_rows(created.threadId!)[0]!.contenu)
    ).toBeNull()

    expect(() =>
      patch_activity(ALICE, created.id, {
        operation: 'save_repayment_plan',
        contenu: plan_content(3)
      })
    ).toThrow(/changed/)
  })

  it('enforces one full snapshot per thread in SQLite', () => {
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-1',
      type: 'repayment_plan.created',
      contenu: plan_content()
    })
    const db = new Database(DATABASE)
    expect(() =>
      db.run(
        `INSERT INTO activites (
           date_creation, rattachement, auteur, type, mentions, contenu, thread_id, revision
         ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
        [
          '2026-09-10T10:00:00Z',
          'repayment:LOC-1',
          'user:alice@example.org',
          'repayment_plan.updated',
          '[]',
          plan_content(500),
          created.threadId!
        ]
      )
    ).toThrow(/UNIQUE/)
    db.close()
  })

  it('rejects legacy content', () => {
    expect(() =>
      create_activity(ALICE, {
        contexte: 'repayment',
        ref: 'LOC-1',
        type: 'repayment_plan.created',
        contenu: JSON.stringify({ version: 1, titre: "Plan d'apurement" })
      })
    ).toThrow(/Invalid repayment_plan\.created content/)
  })

  it('returns JSON for invalid plan content', async () => {
    const app = new Hono<{ Variables: { user: User } }>()
    app.use('*', async (context, next) => {
      context.set('user', {
        email: ALICE,
        isAdministrator: false,
        moduleIds: ['repayment'],
        chatbotIds: []
      })
      await next()
    })
    app.post('/activities', postActivity)
    const response = await app.request('/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contexte: 'repayment',
        ref: 'LOC-1',
        type: 'repayment_plan.created',
        contenu: JSON.stringify({ version: 1, titre: "Plan d'apurement" })
      })
    })
    expect(response.status).toBe(400)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toMatchObject({
      error: { code: 'invalid_body', message: 'Invalid repayment_plan.created content' }
    })
  })
})
