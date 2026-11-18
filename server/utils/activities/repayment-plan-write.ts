import { Database } from 'bun:sqlite'

import {
  type Activity,
  activityTimestamp,
  type CaseFileChronologyItem,
  type Mention
} from '../../../shared/activities'
import {
  parseRepaymentCaseFileContent,
  type RepaymentCaseFile,
  type RepaymentPlanEventType
} from '../../../shared/repayment-case-file'
import { sync_plan_chronology } from './repayment-plan-chronology'
import { type ActivityFacets, get_activity_with_db, insert_activity_row } from './rows'
import { ActivitiesError } from './schema'

type PlanRowValues = {
  rattachement: string
  auteur: string
  facets: ActivityFacets
  mentions: Mention[]
  thread_id: string
  type: RepaymentPlanEventType
  contenu: string
  date_creation?: string
  idempotency_key?: string | null
}

const append_plan_event = (db: Database, values: PlanRowValues): Activity => {
  try {
    return insert_activity_row(db, {
      date_creation: values.date_creation ?? activityTimestamp(),
      rattachement: values.rattachement,
      auteur: values.auteur,
      facets: values.facets,
      type: values.type,
      mentions: values.mentions,
      contenu: values.contenu,
      thread_id: values.thread_id,
      revision: null,
      idempotency_key: values.idempotency_key ?? null
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('UNIQUE') && values.idempotency_key) {
      throw new ActivitiesError('Activity already exists for this treatment', 'conflict')
    }
    if (message.includes('UNIQUE')) {
      throw new ActivitiesError('Repayment plan snapshot already exists', 'conflict')
    }
    throw error
  }
}

const latest_plan_event = (db: Database, threadId: string): Activity | null => {
  const row = db
    .query<{ id: number }, [string]>(
      `SELECT id FROM activites
       WHERE thread_id = ?
         AND type IN (
           'repayment_plan.created',
           'repayment_plan.updated',
           'repayment_plan.finalized',
           'repayment_plan.closed'
         )
       ORDER BY id DESC LIMIT 1`
    )
    .get(threadId)
  return row ? (get_activity_with_db(db, Number(row.id)) ?? null) : null
}

const case_file_count = (db: Database, threadId: string): number =>
  db
    .query<{ count: number }, [string]>(
      `SELECT COUNT(*) AS count FROM activites
       WHERE thread_id = ? AND json_type(contenu, '$.donnees_communes') = 'object'`
    )
    .get(threadId)?.count ?? 0

const lots_present = (db: Database): boolean =>
  db
    .query<{ name: string }, [string]>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?"
    )
    .get('lots_locatifs') != null

const read_case_file = (contenu: string): RepaymentCaseFile => {
  const case_file = parseRepaymentCaseFileContent('repayment_plan.updated', contenu)
  if (!case_file) throw new ActivitiesError('Invalid repayment plan content')
  return case_file
}

const require_plan_identity = (case_file: RepaymentCaseFile, rattachement: string): void => {
  const identification = case_file.donnees_communes.identification
  const id_client = identification.id_client?.trim() ?? ''
  const id_locataire = identification.id_locataire?.trim() ?? ''
  if (!id_client || !id_locataire) {
    throw new ActivitiesError('Client and tenant identifiers are required')
  }
  const ref = rattachement.startsWith('repayment:') ? rattachement.slice('repayment:'.length) : ''
  if (id_locataire !== ref) {
    throw new ActivitiesError('Tenant identifier does not match the dossier')
  }
}

const plan_facets = (
  db: Database,
  facets: ActivityFacets,
  case_file: RepaymentCaseFile
): ActivityFacets => {
  const identification = case_file.donnees_communes.identification
  const fromForm = {
    id_client: identification.id_client?.trim() || null,
    id_locataire: identification.id_locataire?.trim() || facets.id_locataire,
    id_lot: identification.id_lot?.trim() || null
  }
  if (!lots_present(db)) return fromForm
  return {
    id_client: facets.id_client ?? fromForm.id_client,
    id_locataire: facets.id_locataire ?? fromForm.id_locataire,
    id_lot: facets.id_lot ?? fromForm.id_lot
  }
}

const clear_case_file = (db: Database, existing: Activity): void => {
  const result = db
    .query<never, [number]>(
      `UPDATE activites
       SET contenu = '{}'
       WHERE id = ? AND json_type(contenu, '$.donnees_communes') = 'object'`
    )
    .run(existing.id)
  if (result.changes !== 1) {
    throw new ActivitiesError('Repayment plan snapshot is missing', 'conflict')
  }
}

export const create_repayment_plan = (
  db: Database,
  values: Omit<PlanRowValues, 'thread_id' | 'type'> & {
    type: 'repayment_plan.created'
  },
  chronologie: CaseFileChronologyItem[]
): Activity => {
  const case_file = read_case_file(values.contenu)
  require_plan_identity(case_file, values.rattachement)
  const plan = append_plan_event(db, {
    ...values,
    facets: plan_facets(db, values.facets, case_file),
    type: 'repayment_plan.created',
    thread_id: Bun.randomUUIDv7()
  })
  sync_plan_chronology(db, plan, chronologie, values.auteur)
  return plan
}

export const save_repayment_plan = (
  db: Database,
  values: {
    existing: Activity
    auteur: string
    contenu: string
    chronologie: CaseFileChronologyItem[]
  }
): Activity => {
  if (!values.existing.threadId || !values.existing.type.startsWith('repayment_plan.')) {
    throw new ActivitiesError('Invalid repayment plan', 'invalid_body')
  }
  const latest = latest_plan_event(db, values.existing.threadId)
  if (!latest || latest.id !== values.existing.id) {
    throw new ActivitiesError('Repayment plan has changed', 'conflict')
  }
  const draft =
    values.existing.type === 'repayment_plan.created' ||
    values.existing.type === 'repayment_plan.updated'
  if (!draft) throw new ActivitiesError('Repayment plan is no longer editable', 'conflict')
  if (!parseRepaymentCaseFileContent(values.existing.type, values.existing.contenu)) {
    throw new ActivitiesError('Repayment plan snapshot is missing', 'conflict')
  }
  if (case_file_count(db, values.existing.threadId) !== 1) {
    throw new ActivitiesError('Invalid repayment plan snapshot state', 'conflict')
  }
  const case_file = read_case_file(values.contenu)
  require_plan_identity(case_file, values.existing.rattachement)
  clear_case_file(db, values.existing)
  const saved = append_plan_event(db, {
    rattachement: values.existing.rattachement,
    auteur: values.auteur,
    facets: plan_facets(
      db,
      {
        id_client: values.existing.id_client,
        id_locataire: values.existing.id_locataire,
        id_lot: values.existing.id_lot
      },
      case_file
    ),
    mentions: values.existing.mentions,
    thread_id: values.existing.threadId,
    type: 'repayment_plan.updated',
    contenu: values.contenu
  })
  sync_plan_chronology(db, saved, values.chronologie, values.auteur)
  return saved
}

export const is_repayment_plan_row = (row: { type: string }): boolean =>
  row.type.startsWith('repayment_plan.')
