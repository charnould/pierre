import { Database } from 'bun:sqlite'

import { type Activity, activityTimestamp, type Mention } from '../../../shared/activities'
import {
  parseRepaymentPlanContent,
  type RepaymentPlanEventType
} from '../../../shared/repayment-plan'
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

const dossier_count = (db: Database, threadId: string): number =>
  db
    .query<{ count: number }, [string]>(
      `SELECT COUNT(*) AS count FROM activites
       WHERE thread_id = ? AND json_type(contenu, '$.foyer') = 'object'`
    )
    .get(threadId)?.count ?? 0

const clear_dossier = (db: Database, existing: Activity): void => {
  const result = db
    .query<never, [number]>(
      `UPDATE activites
       SET contenu = '{}'
       WHERE id = ? AND json_type(contenu, '$.foyer') = 'object'`
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
  }
): Activity => {
  if (!parseRepaymentPlanContent(values.type, values.contenu)) {
    throw new ActivitiesError('Invalid repayment plan content')
  }
  return append_plan_event(db, {
    ...values,
    type: 'repayment_plan.created',
    thread_id: Bun.randomUUIDv7()
  })
}

export const save_repayment_plan = (
  db: Database,
  values: { existing: Activity; auteur: string; contenu: string }
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
  if (!parseRepaymentPlanContent(values.existing.type, values.existing.contenu)) {
    throw new ActivitiesError('Repayment plan snapshot is missing', 'conflict')
  }
  if (dossier_count(db, values.existing.threadId) !== 1) {
    throw new ActivitiesError('Invalid repayment plan snapshot state', 'conflict')
  }
  if (!parseRepaymentPlanContent('repayment_plan.updated', values.contenu)) {
    throw new ActivitiesError('Invalid repayment plan content')
  }
  clear_dossier(db, values.existing)
  return append_plan_event(db, {
    rattachement: values.existing.rattachement,
    auteur: values.auteur,
    facets: {
      id_client: values.existing.id_client,
      id_locataire: values.existing.id_locataire,
      id_lot: values.existing.id_lot
    },
    mentions: values.existing.mentions,
    thread_id: values.existing.threadId,
    type: 'repayment_plan.updated',
    contenu: values.contenu
  })
}

export const is_repayment_plan_row = (row: { type: string }): boolean =>
  row.type.startsWith('repayment_plan.')
