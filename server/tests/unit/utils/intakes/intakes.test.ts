import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'

import PizZip from 'pizzip'

import { parseIntakeSubmittedContent } from '../../../../../shared/activity-content'
import {
  type CreateIntakeBody,
  type IntakeConfig,
  intakeKnowledgeOriginalName
} from '../../../../../shared/intakes'
import {
  canManageCollaboratorResource,
  canSeeCollaboratorResource
} from '../../../../utils/collaborator-access'
import { normalize_french_national_phone } from '../../../../utils/contacts'
import { openDatastore } from '../../../../utils/datastore-db'
import { IntakesError } from '../../../../utils/intakes/errors'
import { escapeCsvCell, export_intake_zip } from '../../../../utils/intakes/export-zip'
import {
  cancelPendingIntakeKnowledgeRebuild,
  setIntakeKnowledgeDebounceForTests
} from '../../../../utils/intakes/knowledge'
import { run_due_intake_digests } from '../../../../utils/intakes/notify'
import {
  close_intake,
  create_intake,
  delete_intake,
  get_active_intake_by_token,
  get_intake,
  has_active_intake_token,
  list_intakes,
  publish_intake,
  purge_intake,
  reopen_intake,
  revoke_intake,
  update_intake
} from '../../../../utils/intakes/store'
import {
  get_intake_submission_file,
  record_intake_submission
} from '../../../../utils/intakes/submissions'
import { validateIntakeSubmission } from '../../../../utils/intakes/submit'
import { findKnowledgeSourcesByFilename } from '../../../../utils/knowledge/knowledge-sources'
import { buildProfileDatabase } from '../../../../utils/knowledge/project-profile'
import { setDatastoreRoot, testDatastorePaths } from '../../../../utils/paths'
import { setup } from '../../../../utils/setup'
import { seedInstanceSetup } from '../../../seed-setup'
import { createTestUser } from '../../../test-user'

const paths = testDatastorePaths('intakes_core')

const PDF_BYTES = new TextEncoder().encode('%PDF-1.7\nhello-intake\n')

const baseConfig = (overrides: Partial<IntakeConfig> = {}): IntakeConfig => ({
  form: {
    title: 'Demande de travaux',
    description: 'Signalez un besoin technique.',
    notice: 'Vos données sont utilisées uniquement pour le suivi.',
    fields: [
      { type: 'section', label: 'Coordonnées' },
      { type: 'short_text', label: 'Nom', required: true },
      { type: 'email', label: 'Email', required: false },
      { type: 'phone', label: 'Telephone', required: false },
      { type: 'long_text', label: 'Commentaire', required: false },
      { type: 'number', label: 'Surface', required: false },
      { type: 'date', label: 'Date souhaitée', required: false },
      { type: 'datetime', label: 'Créneau', required: false },
      {
        type: 'single_choice',
        label: 'Urgence',
        required: true,
        display: 'radio',
        options: ['Normale', 'Haute']
      },
      {
        type: 'multiple_choice',
        label: 'Équipements',
        required: false,
        options: ['Chauffage', 'Plomberie', 'Électricité']
      },
      { type: 'checkbox', label: 'Accord accès', required: false },
      {
        type: 'file',
        label: 'Pièces jointes',
        required: false,
        accept: ['application/pdf', 'image/png'],
        maxFiles: 2,
        maxFileBytes: 1024 * 1024
      }
    ]
  },
  access: { passwords: [] },
  notifications: { frequency: 'immediate' },
  ...overrides
})

const baseBody = (overrides: Partial<CreateIntakeBody> = {}): CreateIntakeBody => ({
  name: 'Demande de travaux',
  description: 'Suivi des travaux demandés par les locataires',
  tableName: 'demandes_travaux',
  publishToKnowledge: false,
  mentions: ['bob@example.org'],
  config: baseConfig(),
  ...overrides
})

beforeAll(() => {
  setDatastoreRoot(paths.root)
})

beforeEach(async () => {
  cancelPendingIntakeKnowledgeRebuild()
  setIntakeKnowledgeDebounceForTests(60_000)
  await rm(paths.root, { recursive: true, force: true })
  await setup()
  await seedInstanceSetup()
  for (const [email, isAdministrator] of [
    ['alice@example.org', false],
    ['bob@example.org', false],
    ['carol@example.org', false],
    ['admin@example.org', true]
  ] as const) {
    await createTestUser({
      email,
      isAdministrator,
      moduleIds: ['intake', 'automations'],
      chatbotIds: ['default']
    })
  }
})

afterEach(() => {
  cancelPendingIntakeKnowledgeRebuild()
})

afterAll(async () => {
  cancelPendingIntakeKnowledgeRebuild()
  await rm(paths.root, { recursive: true, force: true })
})

const alice = { email: 'alice@example.org', isAdministrator: false }
const bob = { email: 'bob@example.org', isAdministrator: false }
const carol = { email: 'carol@example.org', isAdministrator: false }
const admin = { email: 'admin@example.org', isAdministrator: true }

describe('intakes core lifecycle, permissions, validation, export, digests and knowledge', () => {
  it('enforces unified owner/mentions/admin access rules', () => {
    expect(canSeeCollaboratorResource('alice@example.org', ['bob@example.org'], alice)).toBe(true)
    expect(canSeeCollaboratorResource('alice@example.org', ['bob@example.org'], bob)).toBe(true)
    expect(canSeeCollaboratorResource('alice@example.org', ['bob@example.org'], carol)).toBe(false)
    expect(canSeeCollaboratorResource('alice@example.org', ['bob@example.org'], admin)).toBe(true)

    expect(canManageCollaboratorResource('alice@example.org', alice)).toBe(true)
    expect(canManageCollaboratorResource('alice@example.org', bob)).toBe(false)
    expect(canManageCollaboratorResource('alice@example.org', admin)).toBe(true)

    const created = create_intake(alice.email, baseBody())
    expect(list_intakes(alice).map((i) => i.id)).toEqual([created.id])
    expect(list_intakes(bob).map((i) => i.id)).toEqual([created.id])
    expect(list_intakes(carol)).toEqual([])
    expect(list_intakes(admin).map((i) => i.id)).toEqual([created.id])

    expect(() => update_intake(created.id, bob, { name: 'Hack' })).toThrow(IntakesError)
    expect(get_intake(created.id, carol)).toBeNull()

    const editedByAdmin = update_intake(created.id, admin, { name: 'Demande de travaux v2' })
    expect(editedByAdmin.name).toBe('Demande de travaux v2')
  })

  it('normalizes metropolitan and DROM French phones to 10 national digits and rejects foreign numbers', () => {
    expect(normalize_french_national_phone('06 12 34 56 78')).toBe('0612345678')
    expect(normalize_french_national_phone('+33 6 12 34 56 78')).toBe('0612345678')
    expect(normalize_french_national_phone('+590 690 12 34 56')).toBe('0690123456')
    expect(normalize_french_national_phone('0262 12 34 56')).toBe('0262123456')
    expect(normalize_french_national_phone('+262 692 12 34 56')).toBe('0692123456')
    expect(normalize_french_national_phone('12345')).toBeNull()
    expect(normalize_french_national_phone('+1 650 555 0100')).toBeNull()
    expect(normalize_french_national_phone('+39 06 1234 5678')).toBeNull()
  })

  it('runs full lifecycle and enforces post-publication immutability', () => {
    expect(() => create_intake(alice.email, baseBody({ tableName: 'sqlite_sequence' }))).toThrow(
      IntakesError
    )
    const draft = create_intake(alice.email, baseBody())
    expect(draft.status).toBe('draft')
    expect(draft.token).toBeNull()
    expect(() => export_intake_zip(draft.id, alice)).toThrow(IntakesError)
    expect(() => export_intake_zip(draft.id, carol)).toThrow(IntakesError)

    const renamedDraft = update_intake(draft.id, alice, {
      tableName: 'travaux_locataires'
    })
    expect(renamedDraft.tableName).toBe('travaux_locataires')

    const published = publish_intake(draft.id, alice)
    expect(published.status).toBe('published')
    expect(published.token).toBeTruthy()
    expect(published.lockedColumns).toContain('nom')

    // Cannot rename table after publication
    expect(() => update_intake(draft.id, alice, { tableName: 'autre_table' })).toThrow(IntakesError)

    // Cannot change type of an existing published column
    const mutatedType = structuredClone(published.config)
    const surfaceIndex = mutatedType.form.fields.findIndex((f) => f.label === 'Surface')
    mutatedType.form.fields[surfaceIndex] = { type: 'short_text', label: 'Surface' }
    expect(() => update_intake(draft.id, alice, { config: mutatedType })).toThrow(IntakesError)

    // Can add a new field and remove an existing field (column stays in SQLite, cannot be reused)
    const evolved = structuredClone(published.config)
    evolved.form.fields = evolved.form.fields.filter((f) => f.label !== 'Surface')
    evolved.form.fields.push({ type: 'short_text', label: 'Bâtiment', required: false })
    const afterEvolve = update_intake(draft.id, alice, { config: evolved })
    expect(afterEvolve.lockedColumns).toContain('surface')
    expect(afterEvolve.lockedColumns).toContain('batiment')

    // Reusing removed column name is forbidden
    const reused = structuredClone(afterEvolve.config)
    reused.form.fields.push({ type: 'number', label: 'Surface' })
    expect(() => update_intake(draft.id, alice, { config: reused })).toThrow(IntakesError)

    // Revoke rotates token and invalidates in-flight submissions using the previous token
    const revoked = revoke_intake(draft.id, alice)
    expect(revoked.token).not.toBe(published.token)
    expect(() =>
      record_intake_submission(published, {
        submissionId: '0198f1a0-7b6c-7000-8000-000000000998',
        columnValues: { nom: 'Stale token', urgence: 'Normale', accord_acces: 0 },
        files: []
      })
    ).toThrow(IntakesError)

    const closed = close_intake(draft.id, alice)
    expect(closed.status).toBe('closed')
    // Submitting against a stale IntakeRecord after close fails with not_found
    expect(() =>
      record_intake_submission(revoked, {
        submissionId: '0198f1a0-7b6c-7000-8000-000000000999',
        columnValues: { nom: 'Late', urgence: 'Normale', accord_acces: 0 },
        files: []
      })
    ).toThrow(IntakesError)

    const reopened = reopen_intake(draft.id, alice)
    expect(reopened.status).toBe('published')

    // Delete drops physical table
    delete_intake(draft.id, alice)
    using db = openDatastore()
    const row = db
      .query<{ n: number }, []>(
        "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'intake_travaux_locataires'"
      )
      .get()
    expect(row?.n).toBe(0)
  })

  it('validates submissions, exports safe CSV + files ZIP, and purges cleanly', async () => {
    const intake = publish_intake(create_intake(alice.email, baseBody()).id, alice)

    const fd = new FormData()
    const subId = '0198f1a0-7b6c-7000-8000-000000000101'
    fd.set('_id', subId)
    fd.set('nom', '=SUM(1+1)')
    fd.set('email', 'locataire@example.org')
    fd.set('telephone', '+590 690 12 34 56')
    fd.set('commentaire', 'Fuite sous évier')
    fd.set('surface', '42,5')
    fd.set('date_souhaitee', '2026-12-01')
    fd.set('creneau', '2026-12-01T14:30')
    fd.set('urgence', 'Haute')
    fd.append('equipements', 'Chauffage')
    fd.append('equipements', 'Plomberie')
    fd.set('accord_acces', '1')
    fd.append('pieces_jointes', new File([PDF_BYTES], 'devis.pdf', { type: 'application/pdf' }))

    const validated = await validateIntakeSubmission(intake, fd)
    expect(validated.ok).toBe(true)
    if (!validated.ok) throw new Error('expected valid submission')

    expect(validated.columnValues['telephone']).toBe('0690123456')
    expect(validated.columnValues['surface']).toBe(42.5)
    expect(validated.columnValues['creneau']).toBe('2026-12-01T14:30')
    expect(validated.columnValues['equipements']).toBe('["Chauffage","Plomberie"]')
    expect(validated.columnValues['accord_acces']).toBe(1)

    const saved = record_intake_submission(intake, {
      submissionId: validated.submissionId,
      columnValues: validated.columnValues,
      files: validated.files
    })
    expect(saved.duplicate).toBe(false)

    // Idempotent retry on same UUID does not duplicate
    const retry = record_intake_submission(intake, {
      submissionId: validated.submissionId,
      columnValues: validated.columnValues,
      files: validated.files
    })
    expect(retry.duplicate).toBe(true)

    // Immediate notification created for owner + mentions with files metadata
    using db = openDatastore()
    const activities = db
      .query<{ type: string; auteur: string; mentions: string; contenu: string }, [string]>(
        'SELECT type, auteur, mentions, contenu FROM activites WHERE rattachement = ?'
      )
      .all(`intake:${intake.id}`)
    expect(activities).toHaveLength(1)
    expect(activities[0]?.type).toBe('intake.submitted')
    expect(activities[0]?.auteur).toBe(`intake:${intake.id}`)
    expect(JSON.parse(activities[0]!.mentions)).toEqual([
      { destinataire: 'user:alice@example.org' },
      { destinataire: 'user:bob@example.org' }
    ])
    const parsed = parseIntakeSubmittedContent(activities[0]!.contenu)
    expect(parsed?.submissionId).toBe(subId)
    expect(parsed?.files).toEqual([
      {
        field: 'pieces_jointes',
        filename: 'devis.pdf',
        mimeType: 'application/pdf',
        sizeBytes: PDF_BYTES.byteLength
      }
    ])

    // Single file extraction works for collaborator too
    const file = get_intake_submission_file(intake.id, subId, 'devis.pdf', bob)
    expect(file).not.toBeNull()
    expect(file!.mimeType).toBe('application/pdf')
    expect(Array.from(file!.bytes)).toEqual(Array.from(PDF_BYTES))

    // ZIP export has UTF-8 BOM, formula-neutralized CSV, no _files column, and extracted binary
    expect(escapeCsvCell('=1+1')).toBe("'=1+1")
    expect(escapeCsvCell('+cmd')).toBe("'+cmd")
    expect(escapeCsvCell('-2')).toBe("'-2")
    expect(escapeCsvCell('@evil')).toBe("'@evil")

    const exported = export_intake_zip(intake.id, bob)
    expect(exported.filename).toBe(`${intake.tableName}.zip`)
    const zip = new PizZip(exported.bytes)
    const csvEntry = zip.file(`${intake.tableName}.csv`)
    expect(csvEntry).toBeTruthy()
    const csvText = csvEntry!.asText()
    expect(csvText.startsWith('\uFEFF')).toBe(true)
    const [header, rowLine] = csvText.slice(1).trim().split('\r\n')
    expect(header).not.toContain('_files')
    expect(rowLine).toContain("'=SUM(1+1)")
    expect(rowLine).toContain(';oui;')
    expect(rowLine).toContain('Chauffage|Plomberie')

    const extractedZipFile = zip.file(`fichiers/${subId}/devis.pdf`)
    expect(extractedZipFile).toBeTruthy()
    expect(Array.from(extractedZipFile!.asUint8Array())).toEqual(Array.from(PDF_BYTES))

    // Purge empties table
    const purged = purge_intake(intake.id, alice)
    expect(purged.submissionCount).toBe(0)
  })

  it('sends scheduled digests (hourly, daily, weekly, months), handles mode switches, close/reopen and DST', () => {
    using db = openDatastore()

    // 1. Hourly at :15
    const hourly = publish_intake(
      create_intake(
        alice.email,
        baseBody({
          tableName: 'digest_horaire',
          config: baseConfig({ notifications: { frequency: 'hourly', minute: 15 } })
        })
      ).id,
      alice
    )
    expect(hourly.nextNotifyAt).toBeTruthy()
    db.run(
      'UPDATE intakes SET published_at = ?, last_notified_at = ?, next_notify_at = ? WHERE id = ?',
      [
        '2026-11-22T09:00:00.000Z',
        '2026-11-22T09:00:00.000Z',
        '2026-11-22T09:15:00.000Z',
        hourly.id
      ]
    )

    // Before :15 -> 0
    expect(run_due_intake_digests(new Date('2026-11-22T09:14:00.000Z'))).toBe(0)
    // At :15 with 0 new submissions -> 0 emitted, advances next_notify_at to 10:15 without moving last_notified_at
    expect(run_due_intake_digests(new Date('2026-11-22T09:15:00.000Z'))).toBe(0)
    expect(get_intake(hourly.id, alice)?.nextNotifyAt).toBe('2026-11-22T10:15:00.000Z')
    expect(get_intake(hourly.id, alice)?.lastNotifiedAt).toBe('2026-11-22T09:00:00.000Z')

    // 1 new submission -> full detail with submissionId at 10:15
    db.run(
      `INSERT INTO intake_digest_horaire (id, date_creation, nom, urgence, accord_acces)
       VALUES (?, ?, ?, ?, ?)`,
      ['0198f1a0-7b6c-7000-8000-000000000201', '2026-11-22T09:40:00.000Z', 'Dupont', 'Normale', 0]
    )
    expect(run_due_intake_digests(new Date('2026-11-22T10:15:00.000Z'))).toBe(1)
    expect(get_intake(hourly.id, alice)?.nextNotifyAt).toBe('2026-11-22T11:15:00.000Z')
    // Same-minute re-run -> 0 (next_notify_at already moved to 11:15)
    expect(run_due_intake_digests(new Date('2026-11-22T10:15:30.000Z'))).toBe(0)

    // 2 new submissions -> summary digest at 11:15
    db.run(
      `INSERT INTO intake_digest_horaire (id, date_creation, nom, urgence, accord_acces)
       VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)`,
      [
        '0198f1a0-7b6c-7000-8000-000000000202',
        '2026-11-22T10:30:00.000Z',
        'Martin',
        'Haute',
        1,
        '0198f1a0-7b6c-7000-8000-000000000203',
        '2026-11-22T10:45:00.000Z',
        'Durand',
        'Normale',
        0
      ]
    )
    expect(run_due_intake_digests(new Date('2026-11-22T11:15:00.000Z'))).toBe(1)

    const rows = db
      .query<{ contenu: string }, [string]>(
        'SELECT contenu FROM activites WHERE rattachement = ? ORDER BY id ASC'
      )
      .all(`intake:${hourly.id}`)
    expect(rows).toHaveLength(2)
    const first = parseIntakeSubmittedContent(rows[0]!.contenu)
    const second = parseIntakeSubmittedContent(rows[1]!.contenu)
    expect(first?.submissionId).toBe('0198f1a0-7b6c-7000-8000-000000000201')
    expect(first?.values?.['Nom']).toBe('Dupont')
    expect(second?.submissionId).toBeUndefined()
    expect(second?.note).toContain('2')

    // 2. Daily digest at 18:30 Europe/Paris (17:30 UTC in November)
    const daily = publish_intake(
      create_intake(
        alice.email,
        baseBody({
          tableName: 'digest_quotidien',
          config: baseConfig({ notifications: { frequency: 'daily', hour: 18, minute: 30 } })
        })
      ).id,
      alice
    )
    db.run(
      'UPDATE intakes SET published_at = ?, last_notified_at = ?, next_notify_at = ? WHERE id = ?',
      ['2026-11-22T08:00:00.000Z', '2026-11-22T08:00:00.000Z', '2026-11-22T17:30:00.000Z', daily.id]
    )
    db.run(
      `INSERT INTO intake_digest_quotidien (id, date_creation, nom, urgence, accord_acces)
       VALUES (?, ?, ?, ?, ?)`,
      ['0198f1a0-7b6c-7000-8000-000000000210', '2026-11-22T13:00:00.000Z', 'Matin', 'Normale', 0]
    )
    expect(run_due_intake_digests(new Date('2026-11-22T17:29:00.000Z'))).toBe(0)
    expect(run_due_intake_digests(new Date('2026-11-22T17:30:00.000Z'))).toBe(1)
    expect(get_intake(daily.id, alice)?.nextNotifyAt).toBe('2026-11-23T17:30:00.000Z')
    db.run(
      `INSERT INTO intake_digest_quotidien (id, date_creation, nom, urgence, accord_acces)
       VALUES (?, ?, ?, ?, ?)`,
      ['0198f1a0-7b6c-7000-8000-000000000211', '2026-11-22T18:00:00.000Z', 'Soir', 'Haute', 1]
    )
    expect(run_due_intake_digests(new Date('2026-11-22T18:30:00.000Z'))).toBe(0)
    expect(run_due_intake_digests(new Date('2026-11-23T17:30:00.000Z'))).toBe(1)

    // 3. Weekly multi-days [1, 4] (Mon & Thu) at 08:00 Paris + months [3, 9]
    const weekly = publish_intake(
      create_intake(
        alice.email,
        baseBody({
          tableName: 'digest_hebdo',
          config: baseConfig({
            notifications: { frequency: 'weekly', days: [4, 1], hour: 8, minute: 0 }
          })
        })
      ).id,
      alice
    )
    // Zod sorts days ascending
    expect(weekly.config.notifications).toEqual({
      frequency: 'weekly',
      days: [1, 4],
      hour: 8,
      minute: 0
    })
    // 2026-11-23 is Monday (07:00Z = 08:00 Paris CET)
    db.run(
      'UPDATE intakes SET published_at = ?, last_notified_at = ?, next_notify_at = ? WHERE id = ?',
      [
        '2026-11-22T08:00:00.000Z',
        '2026-11-22T08:00:00.000Z',
        '2026-11-23T07:00:00.000Z',
        weekly.id
      ]
    )
    db.run(
      `INSERT INTO intake_digest_hebdo (id, date_creation, nom, urgence, accord_acces)
       VALUES (?, ?, ?, ?, ?)`,
      ['0198f1a0-7b6c-7000-8000-000000000230', '2026-11-22T12:00:00.000Z', 'Lundi', 'Normale', 0]
    )
    expect(run_due_intake_digests(new Date('2026-11-23T07:00:00.000Z'))).toBe(1)
    // Next occurrence is Thursday 2026-11-26 08:00 Paris = 07:00Z
    expect(get_intake(weekly.id, alice)?.nextNotifyAt).toBe('2026-11-26T07:00:00.000Z')

    const seasonal = publish_intake(
      create_intake(
        alice.email,
        baseBody({
          tableName: 'digest_mois',
          config: baseConfig({
            notifications: {
              frequency: 'months',
              months: [9, 3],
              dayOfMonth: 15,
              hour: 9,
              minute: 0
            }
          })
        })
      ).id,
      alice
    )
    expect(seasonal.config.notifications).toEqual({
      frequency: 'months',
      months: [3, 9],
      dayOfMonth: 15,
      hour: 9,
      minute: 0
    })
    db.run(
      'UPDATE intakes SET published_at = ?, last_notified_at = ?, next_notify_at = ? WHERE id = ?',
      [
        '2026-03-01T08:00:00.000Z',
        '2026-03-01T08:00:00.000Z',
        '2026-03-15T08:00:00.000Z',
        seasonal.id
      ]
    )
    db.run(
      `INSERT INTO intake_digest_mois (id, date_creation, nom, urgence, accord_acces)
       VALUES (?, ?, ?, ?, ?)`,
      ['0198f1a0-7b6c-7000-8000-000000000231', '2026-03-10T12:00:00.000Z', 'Mars', 'Normale', 0]
    )
    expect(run_due_intake_digests(new Date('2026-03-15T08:00:00.000Z'))).toBe(1)
    // Next occurrence is September 15 09:00 CEST (07:00Z)
    expect(get_intake(seasonal.id, alice)?.nextNotifyAt).toBe('2026-09-15T07:00:00.000Z')

    // 4. Mode switches: immediate -> recurring advances last_notified_at; recurring -> recurring preserves it; -> none clears next_notify_at
    const switching = publish_intake(
      create_intake(
        alice.email,
        baseBody({
          tableName: 'digest_switch',
          config: baseConfig({ notifications: { frequency: 'immediate' } })
        })
      ).id,
      alice
    )
    expect(switching.nextNotifyAt).toBeNull()
    db.run('UPDATE intakes SET last_notified_at = ? WHERE id = ?', [
      '2026-01-01T00:00:00.000Z',
      switching.id
    ])
    const switchedToDaily = update_intake(switching.id, alice, {
      config: {
        ...switching.config,
        notifications: { frequency: 'daily', hour: 9, minute: 0 }
      }
    })
    expect(switchedToDaily.nextNotifyAt).toBeTruthy()
    expect(switchedToDaily.lastNotifiedAt).not.toBe('2026-01-01T00:00:00.000Z')
    const savedLastNotified = switchedToDaily.lastNotifiedAt
    const switchedToHourly = update_intake(switching.id, alice, {
      config: {
        ...switchedToDaily.config,
        notifications: { frequency: 'hourly', minute: 30 }
      }
    })
    expect(switchedToHourly.lastNotifiedAt).toBe(savedLastNotified)
    expect(switchedToHourly.nextNotifyAt).toBeTruthy()
    const switchedToNone = update_intake(switching.id, alice, {
      config: {
        ...switchedToHourly.config,
        notifications: { frequency: 'none' }
      }
    })
    expect(switchedToNone.nextNotifyAt).toBeNull()

    // 5. Close -> final digest drains pending submissions then clears next_notify_at; reopen -> recomputes next_notify_at
    const closing = publish_intake(
      create_intake(
        alice.email,
        baseBody({
          tableName: 'digest_close',
          config: baseConfig({ notifications: { frequency: 'hourly', minute: 0 } })
        })
      ).id,
      alice
    )
    db.run(
      'UPDATE intakes SET published_at = ?, last_notified_at = ?, next_notify_at = ? WHERE id = ?',
      [
        '2026-11-22T09:00:00.000Z',
        '2026-11-22T09:00:00.000Z',
        '2026-11-22T10:00:00.000Z',
        closing.id
      ]
    )
    db.run(
      `INSERT INTO intake_digest_close (id, date_creation, nom, urgence, accord_acces)
       VALUES (?, ?, ?, ?, ?)`,
      ['0198f1a0-7b6c-7000-8000-000000000240', '2026-11-22T09:30:00.000Z', 'Avant', 'Normale', 0]
    )
    const closed = close_intake(closing.id, alice)
    expect(closed.nextNotifyAt).toBe('2026-11-22T10:00:00.000Z')
    expect(run_due_intake_digests(new Date('2026-11-22T10:00:00.000Z'))).toBe(1)
    expect(get_intake(closing.id, alice)?.nextNotifyAt).toBeNull()
    const reopened = reopen_intake(closing.id, alice)
    expect(reopened.nextNotifyAt).toBeTruthy()

    // 6. DST Europe/Paris: spring-forward 2026-03-29 02:30 skipped to 2026-03-30 02:30 CEST (00:30Z);
    //    fall-back 2026-10-25 02:30 fires at 00:30Z CEST and schedules next at 01:30Z CET
    const dstDaily = publish_intake(
      create_intake(
        alice.email,
        baseBody({
          tableName: 'digest_dst',
          config: baseConfig({ notifications: { frequency: 'daily', hour: 2, minute: 30 } })
        })
      ).id,
      alice
    )
    db.run(
      'UPDATE intakes SET published_at = ?, last_notified_at = ?, next_notify_at = ? WHERE id = ?',
      [
        '2026-03-28T01:00:00.000Z',
        '2026-03-28T01:00:00.000Z',
        '2026-03-28T01:30:00.000Z',
        dstDaily.id
      ]
    )
    // Firing on 2026-03-28 02:30 CET (01:30Z) skips nonexistent 2026-03-29 02:30 to 2026-03-30 02:30 CEST (00:30Z)
    expect(run_due_intake_digests(new Date('2026-03-28T01:30:00.000Z'))).toBe(0)
    expect(get_intake(dstDaily.id, alice)?.nextNotifyAt).toBe('2026-03-30T00:30:00.000Z')

    // Fall-back: 2026-10-25 02:30 occurs at 00:30Z (CEST) and 01:30Z (CET)
    db.run('UPDATE intakes SET last_notified_at = ?, next_notify_at = ? WHERE id = ?', [
      '2026-10-24T20:00:00.000Z',
      '2026-10-25T00:30:00.000Z',
      dstDaily.id
    ])
    db.run(
      `INSERT INTO intake_digest_dst (id, date_creation, nom, urgence, accord_acces)
       VALUES (?, ?, ?, ?, ?)`,
      ['0198f1a0-7b6c-7000-8000-000000000222', '2026-10-24T22:00:00.000Z', 'Automne', 'Normale', 0]
    )
    expect(run_due_intake_digests(new Date('2026-10-25T00:30:00.000Z'))).toBe(1)
    expect(get_intake(dstDaily.id, alice)?.nextNotifyAt).toBe('2026-10-25T01:30:00.000Z')
    db.run(
      `INSERT INTO intake_digest_dst (id, date_creation, nom, urgence, accord_acces)
       VALUES (?, ?, ?, ?, ?)`,
      ['0198f1a0-7b6c-7000-8000-000000000223', '2026-10-25T00:45:00.000Z', 'Bis', 'Normale', 0]
    )
    expect(run_due_intake_digests(new Date('2026-10-25T01:30:00.000Z'))).toBe(1)
    expect(get_intake(dstDaily.id, alice)?.nextNotifyAt).toBe('2026-10-26T01:30:00.000Z')
  })

  it('projects publishToKnowledge intakes without _files or PII and writes description into _readme', () => {
    const configWithPii = baseConfig()
    configWithPii.form.fields.push(
      { type: 'short_text', label: 'Nom locataire', required: false },
      { type: 'email', label: 'Email locataire', required: false },
      { type: 'short_text', label: 'Adresse', required: false }
    )
    const intake = publish_intake(
      create_intake(
        alice.email,
        baseBody({
          tableName: 'enquete_parc',
          description: 'Enquête annuelle de satisfaction sur le parc immobilier',
          publishToKnowledge: true,
          config: configWithPii
        })
      ).id,
      alice
    )

    record_intake_submission(intake, {
      submissionId: '0198f1a0-7b6c-7000-8000-000000000301',
      columnValues: {
        nom: 'Référence A',
        nom_locataire: 'Jean Secret',
        email_locataire: 'secret@example.org',
        adresse: '12 rue des Lilas',
        commentaire: 'Très satisfait du gardien',
        urgence: 'Normale',
        accord_acces: 1
      },
      files: [
        {
          field: 'pieces_jointes',
          filename: 'justif.pdf',
          mimeType: 'application/pdf',
          bytes: PDF_BYTES
        }
      ]
    })

    // Verify knowledge_records entry exists with the defined intake name as title
    const matchingSources = findKnowledgeSourcesByFilename(
      intakeKnowledgeOriginalName(intake.tableName)
    )
    expect(matchingSources).toHaveLength(1)
    expect(matchingSources[0]?.fileType).toBe('intake')
    expect(matchingSources[0]?.title).toBe('Demande de travaux')
    expect(matchingSources[0]?.description).toBe(
      'Enquête annuelle de satisfaction sur le parc immobilier'
    )
    expect(matchingSources[0]?.originalName).toBe('intake:enquete_parc')

    // Renaming the intake updates the encyclopedia title without colliding with reserved Core Data names
    update_intake(intake.id, alice, { name: 'Réclamations' })
    const renamedSources = findKnowledgeSourcesByFilename(
      intakeKnowledgeOriginalName(intake.tableName)
    )
    expect(renamedSources[0]?.title).toBe('Réclamations')
    expect(renamedSources[0]?.description).toBe(
      'Enquête annuelle de satisfaction sur le parc immobilier'
    )

    // Project into an encyclopaedia profile SQLite database
    const profileDbPath = `${paths.root}/profile-test.sqlite`
    buildProfileDatabase({
      path: profileDbPath,
      datastorePath: paths.database,
      sqlTables: [{ source: `intake_${intake.tableName}`, target: intake.tableName }],
      rowTables: [],
      documents: [],
      fingerprint: 'fingerprint-test',
      tableDescriptions: new Map([[intake.tableName, intake.description]])
    })

    using profileDb = new Database(profileDbPath, { readonly: true })
    const cols = profileDb
      .query<{ name: string }, []>('PRAGMA table_info(enquete_parc)')
      .all()
      .map((c) => c.name)
    expect(cols).toContain('commentaire')
    expect(cols).toContain('urgence')
    expect(cols).not.toContain('_files')
    expect(cols).not.toContain('nom_locataire')
    expect(cols).not.toContain('email_locataire')
    expect(cols).not.toContain('adresse')

    const readme = profileDb.query<{ content: string }, []>('SELECT content FROM _readme').get()
    expect(readme?.content).toContain('Enquête annuelle de satisfaction sur le parc immobilier')
  })

  it('rejects 0-byte uploaded files, formats archived checkbox/file columns in CSV, and honors live metadata on submission', async () => {
    const published = publish_intake(create_intake(alice.email, baseBody()).id, alice)
    expect(has_active_intake_token(published.token!)).toBe(true)
    expect(has_active_intake_token('unknown')).toBe(false)
    const publicIntake = get_active_intake_by_token(published.token!)
    expect(publicIntake?.id).toBe(published.id)

    const hexNumberFd = new FormData()
    hexNumberFd.set('_id', '0198f1a0-7b6c-7000-8000-000000000509')
    hexNumberFd.set('nom', 'Test')
    hexNumberFd.set('urgence', 'Normale')
    hexNumberFd.set('surface', '0x10')
    const hexResult = await validateIntakeSubmission(publicIntake!, hexNumberFd)
    expect(hexResult.ok).toBe(false)
    if (!hexResult.ok) {
      expect(hexResult.fields?.['surface']).toBeTruthy()
    }

    // 0-byte file on optional file field must fail validation instead of being silently ignored
    const emptyFileFd = new FormData()
    emptyFileFd.set('_id', '0198f1a0-7b6c-7000-8000-000000000501')
    emptyFileFd.set('nom', 'Test')
    emptyFileFd.set('urgence', 'Normale')
    emptyFileFd.append('pieces_jointes', new File([], 'vide.pdf', { type: 'application/pdf' }))
    const emptyResult = await validateIntakeSubmission(publicIntake!, emptyFileFd)
    expect(emptyResult.ok).toBe(false)
    if (!emptyResult.ok) {
      expect(emptyResult.fields?.['pieces_jointes']).toContain('vide')
    }

    // Update mentions/name after public lookup; record_intake_submission must use live DB state
    update_intake(published.id, alice, {
      name: 'Demande renommée',
      mentions: ['carol@example.org']
    })

    const subId = '0198f1a0-7b6c-7000-8000-000000000502'
    record_intake_submission(publicIntake!, {
      submissionId: subId,
      columnValues: {
        nom: 'Dupont',
        urgence: 'Haute',
        accord_acces: 1,
        pieces_jointes: JSON.stringify(['devis.pdf'])
      },
      files: [
        {
          field: 'pieces_jointes',
          filename: 'devis.pdf',
          mimeType: 'application/pdf',
          bytes: PDF_BYTES
        }
      ]
    })

    using db = openDatastore()
    const activity = db
      .query<{ mentions: string; contenu: string }, [string]>(
        'SELECT mentions, contenu FROM activites WHERE rattachement = ?'
      )
      .get(`intake:${published.id}`)
    expect(JSON.parse(activity!.mentions)).toEqual([
      { destinataire: 'user:alice@example.org' },
      { destinataire: 'user:carol@example.org' }
    ])
    expect(parseIntakeSubmittedContent(activity!.contenu)?.title).toBe('Demande renommée')

    // Remove checkbox + file + multiple_choice + short_text fields from form; CSV export formats
    // archived checkbox/file/multiple_choice without touching archived plain-text JSON strings
    const plainTextIntake = publish_intake(
      create_intake(
        alice.email,
        baseBody({
          tableName: 'archive_csv_test',
          publishToKnowledge: true,
          config: baseConfig({
            form: {
              ...baseConfig().form,
              fields: [
                { type: 'short_text', label: 'Nom', required: true },
                { type: 'short_text', label: 'Note brute', required: false },
                {
                  type: 'multiple_choice',
                  label: 'Équipements',
                  required: false,
                  options: ['Chauffage', 'Plomberie']
                },
                { type: 'checkbox', label: 'Accord accès', required: false },
                {
                  type: 'file',
                  label: 'Pièces jointes',
                  required: false,
                  accept: ['application/pdf'],
                  maxFiles: 1,
                  maxFileBytes: 100 * 1024
                }
              ]
            }
          })
        })
      ).id,
      alice
    )

    // Cannot remove every input field from a published intake
    const noInputsConfig = structuredClone(plainTextIntake.config)
    noInputsConfig.form.fields = [{ type: 'section', label: 'Vide' }]
    expect(() => update_intake(plainTextIntake.id, alice, { config: noInputsConfig })).toThrow(
      IntakesError
    )

    // Unrelated PATCH (mentions/passwords/notifications) does not rewrite knowledge_records
    const beforeSource = findKnowledgeSourcesByFilename(
      intakeKnowledgeOriginalName(plainTextIntake.tableName)
    )[0]!
    await Bun.sleep(5)
    update_intake(plainTextIntake.id, alice, {
      mentions: ['bob@example.org', 'carol@example.org'],
      config: {
        ...plainTextIntake.config,
        access: { passwords: ['p1'] },
        notifications: { frequency: 'none' }
      }
    })
    const afterNoopSource = findKnowledgeSourcesByFilename(
      intakeKnowledgeOriginalName(plainTextIntake.tableName)
    )[0]!
    expect(afterNoopSource.updatedAt).toBe(beforeSource.updatedAt)

    // Sub-1 Mo file limit error reports Ko instead of rounding up to 1 Mo
    const tooBigFd = new FormData()
    tooBigFd.set('_id', '0198f1a0-7b6c-7000-8000-000000000503')
    tooBigFd.set('nom', 'Test')
    tooBigFd.append(
      'pieces_jointes',
      new File([new Uint8Array(150 * 1024)], 'lourd.pdf', { type: 'application/pdf' })
    )
    const tooBigResult = await validateIntakeSubmission(plainTextIntake, tooBigFd)
    expect(tooBigResult.ok).toBe(false)
    if (!tooBigResult.ok) {
      expect(tooBigResult.fields?.['pieces_jointes']).toContain('100 Ko')
    }

    const archivedSubId = '0198f1a0-7b6c-7000-8000-000000000504'
    record_intake_submission(plainTextIntake, {
      submissionId: archivedSubId,
      columnValues: {
        nom: 'Dupont',
        note_brute: '["brut"]',
        equipements: JSON.stringify(['Chauffage', 'Plomberie']),
        accord_acces: 1,
        pieces_jointes: JSON.stringify(['devis.pdf'])
      },
      files: [
        {
          field: 'pieces_jointes',
          filename: 'devis.pdf',
          mimeType: 'application/pdf',
          bytes: PDF_BYTES
        }
      ]
    })

    const strippedConfig = structuredClone(plainTextIntake.config)
    strippedConfig.form.fields = [{ type: 'short_text', label: 'Nom', required: true }]
    const stripped = update_intake(plainTextIntake.id, alice, { config: strippedConfig })
    const zip = new PizZip(export_intake_zip(stripped.id, alice).bytes)
    const csvText = zip.file(`${stripped.tableName}.csv`)!.asText()
    const [, rowLine] = csvText.slice(1).trim().split('\r\n')
    expect(rowLine).toContain(';oui;')
    expect(rowLine).toContain(';Chauffage|Plomberie;')
    expect(rowLine).toContain(';"[""brut""]";')
    expect(rowLine).toContain(`fichiers/${archivedSubId}/devis.pdf`)
  })
})
