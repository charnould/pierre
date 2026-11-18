import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import type { ActivityPatch } from '../../../../shared/activities'
import { parseTaskContent } from '../../../../shared/activity-content'
import {
  blankAdult,
  blankChild,
  blankInstallment,
  blankSchedule,
  emptyRepaymentCaseFile,
  parseRepaymentCaseFileContent
} from '../../../../shared/repayment-case-file'
import { createActivity as postActivity } from '../../../routes/activities'
import type { User } from '../../../utils/_schema'
import { list_activities } from '../../../utils/activities/query'
import {
  latest_repayment_states,
  repayment_action_history
} from '../../../utils/activities/repayment'
import { create_activity, delete_activity, patch_activity } from '../../../utils/activities/write'
import { import_rows } from '../../../utils/knowledge/sqlite-table-import'
import { setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'
import { seedInstanceSetup } from '../../seed-setup'

const paths = testDatastorePaths('repayment_plan_activities')
const DATABASE = paths.database
const ALICE = 'alice@example.org'

const plan_content = (adults = 1): string => {
  const forms = emptyRepaymentCaseFile()
  forms.donnees_communes.identification.id_client = 'CLI-1'
  forms.donnees_communes.identification.id_locataire = 'LOC-1'
  forms.donnees_communes.foyer.adultes = Array.from({ length: adults }, (_, index) => ({
    ...blankAdult(`personne_${index + 1}`),
    prenom: 'Alice',
    nom: 'Martin'
  }))
  forms.donnees_communes.foyer.enfants = [
    { ...blankChild('enfant_1'), prenom: 'Lina', nom: 'Martin' }
  ]
  forms.echeancier = blankSchedule()
  forms.echeancier.echeances = [blankInstallment('2026-11-05', 150)]
  return JSON.stringify(forms)
}

const thread_rows = (threadId: string) =>
  list_activities(ALICE, { rattachement: 'repayment:LOC-1', limit: 100 })
    .filter((row) => row.threadId === threadId)
    .sort((a, b) => a.id - b.id)

const snapshots = (threadId: string) =>
  thread_rows(threadId).filter(
    (row) => parseRepaymentCaseFileContent(row.type, row.contenu)?.donnees_communes != null
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
      contenu: plan_content(1),
      chronologie: []
    })
    expect(created.revision).toBeNull()
    expect(created.threadId).toBeTruthy()
    expect(snapshots(created.threadId!)).toHaveLength(1)
    expect(
      parseRepaymentCaseFileContent(created.type, created.contenu)?.donnees_communes.foyer
    ).toMatchObject({
      adultes: [{ prenom: 'Alice' }],
      enfants: [{ prenom: 'Lina' }]
    })

    const updated = patch_activity(ALICE, created.id, {
      operation: 'save_repayment_plan',
      contenu: plan_content(2),
      chronologie: []
    })
    expect(updated.type).toBe('repayment_plan.updated')
    expect(updated.threadId).toBe(created.threadId)
    expect(snapshots(created.threadId!).map((row) => row.id)).toEqual([updated.id])
    const stored = parseRepaymentCaseFileContent(updated.type, updated.contenu)
    expect(stored?.donnees_communes.foyer).toMatchObject({
      adultes: [{ prenom: 'Alice' }, { prenom: 'Alice' }],
      enfants: [{ prenom: 'Lina' }]
    })
    expect(stored?.echeancier).toMatchObject({
      echeances: [{ date_echeance: '2026-11-05', montant_en_euros: 150 }]
    })
    expect(
      parseRepaymentCaseFileContent(created.type, thread_rows(created.threadId!)[0]!.contenu)
    ).toBeNull()

    expect(() =>
      patch_activity(ALICE, created.id, {
        operation: 'save_repayment_plan',
        contenu: plan_content(3),
        chronologie: []
      })
    ).toThrow(/changed/)
  })

  it('enforces one full snapshot per thread in SQLite', () => {
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-1',
      type: 'repayment_plan.created',
      contenu: plan_content(),
      chronologie: []
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

  it('requires the client and tenant identifiers and keeps them on the activity', () => {
    const missing = emptyRepaymentCaseFile()
    missing.donnees_communes.identification.id_locataire = 'LOC-1'
    expect(() =>
      create_activity(ALICE, {
        contexte: 'repayment',
        ref: 'LOC-1',
        type: 'repayment_plan.created',
        contenu: JSON.stringify(missing),
        chronologie: []
      })
    ).toThrow(/identifiers are required/)

    const mismatched = emptyRepaymentCaseFile()
    mismatched.donnees_communes.identification.id_client = 'CLI-1'
    mismatched.donnees_communes.identification.id_locataire = 'LOC-2'
    expect(() =>
      create_activity(ALICE, {
        contexte: 'repayment',
        ref: 'LOC-1',
        type: 'repayment_plan.created',
        contenu: JSON.stringify(mismatched),
        chronologie: []
      })
    ).toThrow(/does not match/)

    const forms = emptyRepaymentCaseFile()
    forms.donnees_communes.identification.id_client = 'CLI-9'
    forms.donnees_communes.identification.id_locataire = 'LOC-9'
    forms.donnees_communes.identification.id_lot = 'LOT-9'
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-9',
      type: 'repayment_plan.created',
      contenu: JSON.stringify(forms),
      chronologie: []
    })
    expect(created).toMatchObject({
      id_client: 'CLI-9',
      id_locataire: 'LOC-9',
      id_lot: 'LOT-9',
      rattachement: 'repayment:LOC-9'
    })
  })

  it('keeps the typed client when the tenant is absent from the housing stock', async () => {
    const db = new Database(DATABASE)
    await import_rows(db, 'lots_locatifs', [
      { id_client: 'OTHER', id_locataire: 'OTHER', id_lot: 'LOT-OTHER' }
    ])
    db.close()
    const forms = emptyRepaymentCaseFile()
    forms.donnees_communes.identification.id_client = 'CLI-8'
    forms.donnees_communes.identification.id_locataire = 'LOC-8'
    forms.donnees_communes.identification.id_lot = 'LOT-8'
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-8',
      type: 'repayment_plan.created',
      contenu: JSON.stringify(forms),
      chronologie: []
    })
    expect(created).toMatchObject({ id_client: 'CLI-8', id_locataire: 'LOC-8', id_lot: 'LOT-8' })
  })

  it('rejects legacy content', () => {
    expect(() =>
      create_activity(ALICE, {
        contexte: 'repayment',
        ref: 'LOC-1',
        type: 'repayment_plan.created',
        contenu: JSON.stringify({ version: 1, titre: "Plan d'apurement" }),
        chronologie: []
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
        contenu: JSON.stringify({ version: 1, titre: "Plan d'apurement" }),
        chronologie: []
      })
    })
    expect(response.status).toBe(400)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toMatchObject({
      error: { code: 'invalid_body', message: 'Invalid repayment_plan.created content' }
    })
  })
})

const VISIT = '11111111-1111-4111-8111-111111111111'
const CTESI = '22222222-2222-4222-8222-222222222222'
const visit = (date: string, action = 'Visiter à domicile', commentaire: string | null = null) => ({
  kind: 'action' as const,
  id: VISIT,
  action,
  date_realisation: date,
  commentaire
})

const taskRows = (planThreadId: string) => {
  const db = new Database(DATABASE, { readonly: true })
  const rows = db
    .query<
      { id: number; type: string; date_creation: string; contenu: string; revision: number },
      [string]
    >(
      `SELECT id, type, date_creation, contenu, revision
       FROM activites
       WHERE thread_id LIKE ?
       ORDER BY revision, id`
    )
    .all(`${planThreadId}:%`)
  db.close()
  return rows
}

const liveSnapshotId = (planThreadId: string) => {
  const db = new Database(DATABASE, { readonly: true })
  const row = db
    .query<{ id: number }, [string]>(
      `SELECT id FROM activites
       WHERE thread_id = ? AND json_type(contenu, '$.donnees_communes') = 'object'`
    )
    .get(planThreadId)
  db.close()
  return row?.id ?? null
}

describe('repayment plan chronology', () => {
  it('requires the chronology on create and save', () => {
    expect(() =>
      create_activity(ALICE, {
        contexte: 'repayment',
        ref: 'LOC-1',
        type: 'repayment_plan.created',
        contenu: plan_content()
      })
    ).toThrow(/Chronology is required/)

    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-1',
      type: 'repayment_plan.created',
      contenu: plan_content(),
      chronologie: []
    })
    expect(() =>
      patch_activity(ALICE, created.id, {
        operation: 'save_repayment_plan',
        contenu: plan_content()
      } as ActivityPatch)
    ).toThrow(/chronologie/)
  })

  it('writes, corrects and deletes chronology as append-only tasks', () => {
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-1',
      type: 'repayment_plan.created',
      contenu: plan_content(),
      chronologie: [visit('2024-03-01', 'Visiter à domicile', 'Porte close')]
    })
    const createdTasks = taskRows(created.threadId!)
    expect(createdTasks).toHaveLength(1)
    expect(createdTasks[0]).toMatchObject({
      type: 'task.completed',
      revision: 1,
      date_creation: '2024-03-01T12:00:00Z'
    })
    expect(parseTaskContent(createdTasks[0]!.contenu)).toMatchObject({
      completed_on: '2024-03-01',
      result: 'Porte close',
      task: { title: 'Visiter à domicile', state: 'completed' }
    })

    const corrected = patch_activity(ALICE, created.id, {
      operation: 'save_repayment_plan',
      contenu: plan_content(),
      chronologie: [visit('2024-05-02', 'Saisir la CTESI', null)]
    })
    const unchanged = patch_activity(ALICE, corrected.id, {
      operation: 'save_repayment_plan',
      contenu: plan_content(2),
      chronologie: [visit('2024-05-02', 'Saisir la CTESI')]
    })
    const correctedTasks = taskRows(created.threadId!)
    expect(correctedTasks).toHaveLength(2)
    expect(correctedTasks[1]).toMatchObject({ type: 'task.updated', revision: 2 })
    expect(correctedTasks[1]!.date_creation > '2024-05-02T12:00:00Z').toBe(true)
    expect(parseTaskContent(correctedTasks[1]!.contenu)).toMatchObject({
      completed_on: '2024-05-02',
      task: { title: 'Saisir la CTESI', state: 'completed' },
      changes: [
        { field: 'title', before: 'Visiter à domicile', after: 'Saisir la CTESI' },
        { field: 'completed_on', before: '2024-03-01', after: '2024-05-02' },
        { field: 'result', before: 'Porte close', after: null }
      ]
    })
    expect(parseTaskContent(correctedTasks[1]!.contenu)?.result).toBeUndefined()

    const db = new Database(DATABASE, { readonly: true })
    const states = latest_repayment_states(db, ['LOC-1'])
    const history = repayment_action_history(db, ['LOC-1'])
    db.close()
    expect(states.get('LOC-1')).toMatchObject({
      derniere_action_realisee: 'Saisir la CTESI',
      date_derniere_action_realisee: '2024-05-02T12:00:00Z'
    })
    expect([...(history.get('LOC-1') ?? [])]).toEqual(['Saisir la CTESI'])

    const removed = patch_activity(ALICE, unchanged.id, {
      operation: 'save_repayment_plan',
      contenu: plan_content(2),
      chronologie: []
    })
    const deleted = taskRows(created.threadId!).at(-1)!
    expect(deleted.type).toBe('task.deleted')
    expect(parseTaskContent(deleted.contenu)?.task).toMatchObject({
      title: 'Saisir la CTESI',
      state: 'deleted'
    })
    expect(parseTaskContent(deleted.contenu)?.completed_on).toBe('2024-05-02')
    const afterDelete = new Database(DATABASE, { readonly: true })
    expect(
      latest_repayment_states(afterDelete, ['LOC-1']).get('LOC-1')?.derniere_action_realisee ?? null
    ).toBeNull()
    expect(repayment_action_history(afterDelete, ['LOC-1']).get('LOC-1')).toBeUndefined()
    afterDelete.close()

    const taskId = deleted.id
    expect(() =>
      patch_activity(ALICE, taskId, {
        operation: 'reopen_action',
        assigneA: ALICE,
        dateEcheance: '2026-06-01'
      })
    ).toThrow(/repayment plan/)
    expect(() => delete_activity(ALICE, createdTasks[0]!.id)).toThrow(/Forbidden/)

    const snapshot = liveSnapshotId(created.threadId!)
    const count = taskRows(created.threadId!).length
    expect(() =>
      patch_activity(ALICE, removed.id, {
        operation: 'save_repayment_plan',
        contenu: plan_content(3),
        chronologie: [visit('2024-06-01')]
      })
    ).toThrow(/cannot be restored/)
    expect(liveSnapshotId(created.threadId!)).toBe(snapshot)
    expect(taskRows(created.threadId!)).toHaveLength(count)
  })

  it('rejects a child thread that is not a chronology task without touching the snapshot', () => {
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-1',
      type: 'repayment_plan.created',
      contenu: plan_content(),
      chronologie: []
    })
    const db = new Database(DATABASE)
    db.run(
      `INSERT INTO activites (
         date_creation, rattachement, auteur, id_locataire, type, mentions, contenu, thread_id, revision
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        '2024-01-01T12:00:00Z',
        'repayment:LOC-1',
        'user:alice@example.org',
        'LOC-1',
        'task.completed',
        '[]',
        JSON.stringify({ version: 1, task: { title: 'Autre', state: 'completed' } }),
        `${created.threadId}:${CTESI}`,
        1
      ]
    )
    db.close()
    const snapshot = liveSnapshotId(created.threadId!)
    expect(() =>
      patch_activity(ALICE, created.id, {
        operation: 'save_repayment_plan',
        contenu: plan_content(),
        chronologie: []
      })
    ).toThrow(/Invalid chronology activity/)
    expect(liveSnapshotId(created.threadId!)).toBe(snapshot)
  })

  it('append une phase en français et ignore un doublon sans commentaire', async () => {
    await seedInstanceSetup()
    const created = create_activity(ALICE, {
      contexte: 'repayment',
      ref: 'LOC-1',
      type: 'repayment_plan.created',
      contenu: plan_content(),
      chronologie: [
        {
          kind: 'phase',
          phase: 'Amiable',
          date_realisation: '2024-04-01',
          commentaire: 'Accord oral'
        }
      ]
    })
    const phases = () => {
      const db = new Database(DATABASE, { readonly: true })
      const rows = db
        .query<{ contenu: string }, []>(
          `SELECT contenu FROM activites WHERE type = 'case.group_changed' ORDER BY id`
        )
        .all()
      db.close()
      return rows.map((row) => JSON.parse(row.contenu))
    }
    expect(phases()).toEqual([
      { version: 1, before: 'Non traités', after: 'Amiable', note: 'Accord oral' }
    ])
    const saved = patch_activity(ALICE, created.id, {
      operation: 'save_repayment_plan',
      contenu: plan_content(),
      chronologie: [
        { kind: 'phase', phase: 'Amiable', date_realisation: '2024-04-02', commentaire: null }
      ]
    })
    expect(phases()).toHaveLength(1)
    expect(() =>
      patch_activity(ALICE, saved.id, {
        operation: 'save_repayment_plan',
        contenu: plan_content(),
        chronologie: [
          { kind: 'phase', phase: 'Inconnue', date_realisation: '2024-04-03', commentaire: null }
        ]
      })
    ).toThrow(/Invalid repayment phase/)
    expect(phases()).toHaveLength(1)
  })
})
