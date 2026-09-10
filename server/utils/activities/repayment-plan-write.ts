import { Database } from 'bun:sqlite'

import {
  type Activite,
  type Mention,
  type RepaymentPlanCloseReason,
  type RepaymentPlanEventContent,
  type RepaymentPlanEventType,
  activity_timestamp,
  parse_repayment_plan_content
} from '../../../shared/activites'
import { get_activity_with_db, insert_activity_row, type ActivityFacets } from './rows'
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

const append_plan_event = (db: Database, values: PlanRowValues): Activite => {
  try {
    return insert_activity_row(db, {
      date_creation: values.date_creation ?? activity_timestamp(),
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

const without_plan = (content: RepaymentPlanEventContent): string =>
  JSON.stringify({
    version: 2,
    title: content.title,
    ...(content.note ? { note: content.note } : {})
  })

const latest_plan_event = (db: Database, threadId: string): Activite | null => {
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

const assert_current_plan_event = (db: Database, existing: Activite): RepaymentPlanEventContent => {
  if (!existing.thread_id || !existing.type.startsWith('repayment_plan.')) {
    throw new ActivitiesError('Invalid repayment plan', 'invalid_body')
  }
  const latest = latest_plan_event(db, existing.thread_id)
  if (!latest || latest.id !== existing.id) {
    throw new ActivitiesError('Repayment plan has changed', 'conflict')
  }
  const content = parse_repayment_plan_content(existing.type, existing.contenu)
  if (!content?.plan) throw new ActivitiesError('Repayment plan snapshot is missing', 'conflict')
  const snapshots = db
    .query<{ count: number }, [string]>(
      `SELECT COUNT(*) AS count FROM activites
       WHERE thread_id = ? AND json_type(contenu, '$.plan') = 'object'`
    )
    .get(existing.thread_id)?.count
  if (snapshots !== 1) {
    throw new ActivitiesError('Invalid repayment plan snapshot state', 'conflict')
  }
  return content
}

const strip_plan_snapshot = (db: Database, existing: Activite): void => {
  const result = db
    .query<never, [number]>(
      `UPDATE activites
       SET contenu = json_remove(contenu, '$.plan')
       WHERE id = ? AND json_type(contenu, '$.plan') = 'object'`
    )
    .run(existing.id)
  if (result.changes !== 1) {
    throw new ActivitiesError('Repayment plan snapshot is missing', 'conflict')
  }
}

export const create_repayment_plan = (
  db: Database,
  values: Omit<PlanRowValues, 'thread_id' | 'type'> & {
    type: 'repayment_plan.created' | 'repayment_plan.finalized'
  }
): Activite => {
  const content = parse_repayment_plan_content(values.type, values.contenu)
  if (!content?.plan) throw new ActivitiesError('Invalid repayment plan content')
  const threadId = Bun.randomUUIDv7()
  if (values.type === 'repayment_plan.created') {
    return append_plan_event(db, {
      ...values,
      type: 'repayment_plan.created',
      thread_id: threadId,
      contenu: JSON.stringify(content)
    })
  }
  append_plan_event(db, {
    ...values,
    type: 'repayment_plan.created',
    thread_id: threadId,
    mentions: [],
    contenu: without_plan(content),
    idempotency_key: null
  })
  return append_plan_event(db, {
    ...values,
    type: 'repayment_plan.finalized',
    thread_id: threadId,
    contenu: JSON.stringify(content)
  })
}

export const transition_repayment_plan = (
  db: Database,
  values: {
    existing: Activite
    auteur: string
    operation: 'save' | 'finalize' | 'close' | 'withdraw'
    contenu?: string
    reason?: RepaymentPlanCloseReason
  }
): Activite => {
  const current = assert_current_plan_event(db, values.existing)
  const draft =
    values.existing.type === 'repayment_plan.created' ||
    values.existing.type === 'repayment_plan.updated'
  if ((values.operation === 'save' || values.operation === 'finalize') && !draft) {
    throw new ActivitiesError('Repayment plan is no longer editable', 'conflict')
  }
  if (values.operation === 'close' && values.existing.type !== 'repayment_plan.finalized') {
    throw new ActivitiesError('Only a finalized plan can be closed', 'conflict')
  }
  if (values.operation === 'withdraw' && !draft) {
    throw new ActivitiesError('Only a draft plan can be withdrawn', 'conflict')
  }

  let type: RepaymentPlanEventType
  let content: RepaymentPlanEventContent
  if (values.operation === 'save' || values.operation === 'finalize') {
    type = values.operation === 'save' ? 'repayment_plan.updated' : 'repayment_plan.finalized'
    const parsed = parse_repayment_plan_content(type, values.contenu ?? '')
    if (!parsed?.plan) throw new ActivitiesError('Invalid repayment plan content')
    content = parsed
  } else {
    if (values.operation === 'close' && !values.reason) {
      throw new ActivitiesError('Repayment plan close reason is required')
    }
    type = 'repayment_plan.closed'
    content = {
      version: 2,
      title: current.title,
      plan: current.plan,
      ...(current.note ? { note: current.note } : {})
    }
  }

  strip_plan_snapshot(db, values.existing)
  return append_plan_event(db, {
    rattachement: values.existing.rattachement,
    auteur: values.auteur,
    facets: {
      id_client: values.existing.id_client,
      id_locataire: values.existing.id_locataire,
      id_lot: values.existing.id_lot
    },
    mentions: values.existing.mentions,
    thread_id: values.existing.thread_id!,
    type,
    contenu:
      type === 'repayment_plan.closed'
        ? JSON.stringify({
            ...content,
            reason: values.operation === 'withdraw' ? 'withdrawn' : values.reason
          })
        : JSON.stringify(content)
  })
}

export const is_repayment_plan_row = (row: { type: string }): boolean =>
  row.type.startsWith('repayment_plan.')
