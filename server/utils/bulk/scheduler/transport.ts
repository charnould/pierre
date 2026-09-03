import { Database } from 'bun:sqlite'

import type { ActivityStatus, Activite } from '../../../../shared/activites'
import type { SimpleDeliveryStep } from '../../../../shared/bulk-operations'
import { collect_rich_rcs_replies } from '../../../../shared/bulk-rich-rcs'
import { communication_reference, next_status_timestamp } from '../../communications/parsing'
import { create_outbound_with_db } from '../../communications/storage'
import { datastorePaths } from '../../paths'
import { send_rcs_message } from '../../rcs/send'
import { to_cm_number } from '../../rcs/wrap'
import { insert_bulk_visible_activity } from '../activities'
import {
  enrich_final_failure,
  load_bulk_run_context_with_db,
  type BulkItemPayload,
  type BulkRunContext
} from '../jobs'
import {
  bulk_step_destination,
  fallback_outbound_contenu,
  render_fallback_step,
  rich_rcs_outbound_contenu
} from '../outbound'
import { render_content } from '../placeholders'
import { finalize_bulk_item_with_db } from '../reports'
import { select_fallback_route } from '../route-policy'
import { update_status, update_status_with_db } from '../status'

export type Job = {
  id: string
  bulk_operation_id: string
  execution_id: string
  item_id: string
  attempts: number
  current_activity_id: number | null
  payload: string
}

type SimulationDecision = 'accepted' | 'failed'
export type SimulationOverride = (input: {
  activity: Activite
  key: string
  step: SimpleDeliveryStep
  rendered: unknown
  subject?: string
}) => Promise<SimulationDecision>
export type Clock = { now: () => Date }

export const datastore_path = (): string => datastorePaths().database

let simulationOverride: SimulationOverride | null = null
let clock: Clock = { now: () => new Date() }
let clockOverridden = false
let transactionHook: ((point: 'fallback_created' | 'rich_created') => void) | null = null

export const set_bulk_transport_for_tests = (override: SimulationOverride | null): void => {
  simulationOverride = override
}

export const set_transport_clock_for_tests = (override: Clock | null): void => {
  clockOverridden = override !== null
  clock = override ?? { now: () => new Date() }
}

export const set_bulk_transaction_hook_for_tests = (
  hook: ((point: 'fallback_created' | 'rich_created') => void) | null
): void => {
  transactionHook = hook
}

export const bulk_now = (): Date => clock.now()

export const bulk_clock_overridden = (): boolean => clockOverridden

const hash = (value: string): number => {
  let result = 2166136261
  for (const char of value) {
    result ^= char.charCodeAt(0)
    result = Math.imul(result, 16777619)
  }
  return result >>> 0
}

const deterministic_status = (key: string, step: SimpleDeliveryStep): ActivityStatus => {
  const value = hash(key)
  if (value % 10 === 0) return 'failed'
  if (
    (step.medium === 'rcs' || step.medium === 'email' || step.medium === 'lre') &&
    value % 3 === 0
  ) {
    return 'read'
  }
  return 'delivered'
}

const transition_delay = (key: string, status: ActivityStatus): number =>
  5 + (hash(`${key}:${status}`) % 6)

const guarded_context = (db: Database, job: Job): BulkRunContext | null =>
  load_bulk_run_context_with_db(db, job.execution_id, job.bulk_operation_id)

const process_fallback_attempt = async (
  job: Job,
  payload: Extract<BulkItemPayload, { kind: 'fallback' }>
): Promise<void> => {
  let context: BulkRunContext | null = null
  let activePayload = payload
  let skipped = [...payload.row.skippedSteps]
  let resolved:
    | {
        step: SimpleDeliveryStep
        index: number
        rendered: ReturnType<typeof render_fallback_step>
      }
    | undefined
  let activity: Activite | null = null
  let attemptKey = ''
  const prepare = new Database(datastore_path())
  prepare.run('BEGIN IMMEDIATE')
  try {
    context = guarded_context(prepare, job)
    const current = prepare
      .query<{ payload: string; report_status: string }, [string]>(
        'SELECT payload, report_status FROM bulk_jobs WHERE id = ?'
      )
      .get(job.id)
    const currentPayload = current ? (JSON.parse(current.payload) as BulkItemPayload) : null
    if (
      !context ||
      context.operation.definition.delivery.kind !== 'fallback' ||
      current?.report_status !== 'in_progress' ||
      currentPayload?.kind !== 'fallback' ||
      currentPayload.stage !== 'attempt' ||
      currentPayload.stepIndex !== activePayload.stepIndex
    ) {
      prepare.run('COMMIT')
      return
    }
    activePayload = currentPayload
    const selection = select_fallback_route(
      activePayload.row,
      context.operation.definition.delivery.steps,
      activePayload.stepIndex
    )
    skipped = [
      ...activePayload.row.skippedSteps,
      ...selection.skippedSteps.filter(
        (candidate) =>
          !activePayload.row.skippedSteps.some(
            (existing) => existing.stepIndex === candidate.stepIndex
          )
      )
    ]
    if (!selection.route) {
      if (activePayload.previousActivityId) {
        enrich_final_failure(prepare, activePayload.previousActivityId, {
          code: 'no_usable_fallback',
          skipped_steps: skipped
        })
      } else {
        insert_bulk_visible_activity(prepare, {
          actor: context.actor,
          bulkId: context.operation.id,
          executionId: job.execution_id,
          row: activePayload.row,
          type: 'bulk_no_route',
          status: 'logged',
          content: { no_usable_route: true, skipped_steps: skipped },
          notifyManager: context.operation.definition.notifyManager,
          idempotencyKey: `bulk:${job.execution_id}:recipient:${activePayload.row.id_locataire}:no-route`
        })
      }
      finalize_bulk_item_with_db(prepare, {
        jobId: job.id,
        status: 'ko',
        outcome: {
          code: activePayload.previousActivityId ? 'final_failure' : 'no_usable_route',
          skipped_steps: skipped
        },
        currentActivityId: activePayload.previousActivityId ?? null,
        payload: activePayload
      })
      prepare.run('COMMIT')
      return
    }
    const step = context.operation.definition.delivery.steps[selection.route.stepIndex]!
    resolved = {
      step,
      index: selection.route.stepIndex,
      rendered: render_fallback_step(activePayload.row, context.confirmedAt, step)
    }
    attemptKey = `bulk:${job.execution_id}:recipient:${activePayload.row.id_locataire}:attempt:${resolved.index}`
    activity = create_outbound_with_db(prepare, {
      actor: context.actor,
      contexte: 'repayment',
      ref: activePayload.row.id_locataire,
      type: resolved.step.medium,
      destinataire: bulk_step_destination(activePayload.row, resolved.step),
      contenu: fallback_outbound_contenu(resolved.step, resolved.rendered, skipped),
      bulk_id: context.operation.id,
      execution_id: job.execution_id,
      idempotency_key: attemptKey,
      notify_current_manager: context.operation.definition.notifyManager,
      require_bulk_run: {
        bulk_operation_id: job.bulk_operation_id,
        execution_id: job.execution_id
      }
    })
    transactionHook?.('fallback_created')
    prepare.run(
      `UPDATE bulk_jobs
       SET current_activity_id = ?, run_at = ?, last_error = NULL
       WHERE id = ? AND report_status = 'in_progress'`,
      [activity.id, new Date(clock.now().getTime() + 60_000).toISOString(), job.id]
    )
    prepare.run('COMMIT')
  } catch (error) {
    prepare.run('ROLLBACK')
    throw error
  } finally {
    prepare.close()
  }
  if (!context || !resolved || !activity) return
  const decision = simulationOverride
    ? await simulationOverride({
        activity,
        key: attemptKey,
        step: resolved.step,
        rendered: resolved.rendered.rendered,
        subject: resolved.rendered.subject
      })
    : Bun.env['NODE_ENV'] === 'test'
      ? 'accepted'
      : 'failed'
  const db = new Database(datastore_path())
  db.run('BEGIN IMMEDIATE')
  try {
    if (!guarded_context(db, job)) {
      db.run('COMMIT')
      return
    }
    const current = db
      .query<
        { report_status: string; current_activity_id: number | null; payload: string },
        [string]
      >('SELECT report_status, current_activity_id, payload FROM bulk_jobs WHERE id = ?')
      .get(job.id)
    const currentPayload = current ? (JSON.parse(current.payload) as BulkItemPayload) : null
    if (
      current?.report_status !== 'in_progress' ||
      current.current_activity_id !== activity.id ||
      currentPayload?.kind !== 'fallback' ||
      currentPayload.stage !== 'attempt' ||
      currentPayload.stepIndex !== activePayload.stepIndex
    ) {
      db.run('COMMIT')
      return
    }
    const terminal =
      decision === 'failed'
        ? 'failed'
        : simulationOverride
          ? 'delivered'
          : deterministic_status(attemptKey, resolved.step)
    const nextPayload: BulkItemPayload = {
      ...activePayload,
      stage: 'status',
      stepIndex: resolved.index,
      remainingStatuses: ['sent', terminal]
    }
    db.run(
      `UPDATE bulk_jobs
       SET current_activity_id = ?, run_at = ?, payload = ?, last_error = NULL
       WHERE id = ? AND report_status = 'in_progress'`,
      [
        activity.id,
        new Date(clock.now().getTime() + transition_delay(attemptKey, 'sent')).toISOString(),
        JSON.stringify(nextPayload),
        job.id
      ]
    )
    db.run('COMMIT')
  } catch (error) {
    db.run('ROLLBACK')
    throw error
  } finally {
    db.close()
  }
}

const process_fallback_status = (job: Job): void => {
  const db = new Database(datastore_path())
  db.run('BEGIN IMMEDIATE')
  try {
    const current = db
      .query<
        { payload: string; current_activity_id: number | null; report_status: string },
        [string]
      >('SELECT payload, current_activity_id, report_status FROM bulk_jobs WHERE id = ?')
      .get(job.id)
    if (
      !current ||
      current.report_status !== 'in_progress' ||
      current.current_activity_id == null
    ) {
      db.run('COMMIT')
      return
    }
    const payload = JSON.parse(current.payload) as BulkItemPayload
    const status = payload.kind === 'fallback' ? payload.remainingStatuses?.[0] : undefined
    const context = guarded_context(db, job)
    if (
      payload.kind !== 'fallback' ||
      payload.stage !== 'status' ||
      !status ||
      !context ||
      context.operation.definition.delivery.kind !== 'fallback'
    ) {
      db.run('COMMIT')
      return
    }
    const activity = db
      .query<{ date_statut: string }, [number]>('SELECT date_statut FROM activites WHERE id = ?')
      .get(current.current_activity_id)
    if (!activity) throw new Error('Activité de simulation introuvable')
    update_status_with_db(db, {
      activity_id: current.current_activity_id,
      type: context.operation.definition.delivery.steps[payload.stepIndex]!.medium,
      statut: status,
      occurred_at: next_status_timestamp(
        { date_creation: activity.date_statut, date_statut: activity.date_statut } as Activite,
        clock.now()
      )
    })
    const after = db
      .query<{ payload: string; report_status: string }, [string]>(
        'SELECT payload, report_status FROM bulk_jobs WHERE id = ?'
      )
      .get(job.id)
    if (after?.report_status === 'in_progress') {
      const afterPayload = JSON.parse(after.payload) as BulkItemPayload
      if (afterPayload.kind === 'fallback' && afterPayload.stage === 'status') {
        const remaining = afterPayload.remainingStatuses?.slice(1) ?? []
        if (remaining.length > 0) {
          db.run('UPDATE bulk_jobs SET run_at = ?, payload = ? WHERE id = ?', [
            new Date(
              clock.now().getTime() +
                transition_delay(
                  `bulk:${job.execution_id}:recipient:${job.item_id}:attempt:${afterPayload.stepIndex}`,
                  remaining[0]!
                )
            ).toISOString(),
            JSON.stringify({ ...afterPayload, remainingStatuses: remaining }),
            job.id
          ])
        }
      }
    }
    db.run('COMMIT')
  } catch (error) {
    db.run('ROLLBACK')
    throw error
  } finally {
    db.close()
  }
}

const process_rich_send = async (
  job: Job,
  payload: Extract<BulkItemPayload, { kind: 'rich_rcs' }>
): Promise<void> => {
  let activity: Activite | null = null
  let rendered: { body: string; richContent: Record<string, unknown> } | null = null
  const db = new Database(datastore_path())
  db.run('BEGIN IMMEDIATE')
  try {
    const context = guarded_context(db, job)
    const current = db
      .query<{ payload: string; report_status: string }, [string]>(
        'SELECT payload, report_status FROM bulk_jobs WHERE id = ?'
      )
      .get(job.id)
    const currentPayload = current ? (JSON.parse(current.payload) as BulkItemPayload) : null
    if (
      !context ||
      context.operation.definition.delivery.kind !== 'rich_rcs' ||
      current?.report_status !== 'in_progress' ||
      currentPayload?.kind !== 'rich_rcs' ||
      currentPayload.stage !== 'rich_send' ||
      currentPayload.nodeId !== payload.nodeId
    ) {
      db.run('COMMIT')
      return
    }
    const delivery = context.operation.definition.delivery
    const node = delivery.nodes.find((candidate) => candidate.id === currentPayload.nodeId)
    if (!node) throw new Error(`Nœud RCS introuvable : ${currentPayload.nodeId}`)
    rendered = render_content(
      { body: node.body, richContent: node.richContent },
      delivery.placeholderBindings,
      currentPayload.row.values,
      new Date(context.confirmedAt)
    ) as { body: string; richContent: Record<string, unknown> }
    const nodeIndex = delivery.nodes.findIndex((candidate) => candidate.id === node.id)
    const key = `bulk:${job.execution_id}:recipient:${currentPayload.row.id_locataire}:node:${node.id}`
    activity = create_outbound_with_db(db, {
      actor: context.actor,
      contexte: 'repayment',
      ref: currentPayload.row.id_locataire,
      type: 'rcs',
      destinataire: currentPayload.row.telephone ?? '',
      contenu: rich_rcs_outbound_contenu(delivery, node, rendered, nodeIndex),
      bulk_id: context.operation.id,
      execution_id: job.execution_id,
      idempotency_key: key,
      notify_current_manager: context.operation.definition.notifyManager,
      require_bulk_run: {
        bulk_operation_id: job.bulk_operation_id,
        execution_id: job.execution_id
      }
    })
    transactionHook?.('rich_created')
    const waitsForReply = collect_rich_rcs_replies(rendered.richContent).length > 0
    const nextPayload: BulkItemPayload = {
      ...currentPayload,
      stage: waitsForReply ? 'rich_wait_reply' : 'rich_wait_delivery'
    }
    const deadlineHours = waitsForReply ? delivery.replyTimeoutHours : 24
    db.run(
      `UPDATE bulk_jobs
       SET current_activity_id = ?, run_at = ?, payload = ?, last_error = NULL
       WHERE id = ?`,
      [
        activity.id,
        new Date(clock.now().getTime() + deadlineHours * 60 * 60 * 1000).toISOString(),
        JSON.stringify(nextPayload),
        job.id
      ]
    )
    db.run('COMMIT')
  } catch (error) {
    db.run('ROLLBACK')
    throw error
  } finally {
    db.close()
  }
  if (!activity || !rendered) return

  try {
    await send_rcs_message({
      phone: to_cm_number(payload.row.telephone ?? ''),
      richContent: rendered.richContent,
      body: { content: rendered.body },
      reference: communication_reference(activity.id)
    })
    update_status({
      activity_id: activity.id,
      type: 'rcs',
      statut: 'sent',
      occurred_at: next_status_timestamp(activity, clock.now())
    })
  } catch {
    update_status({
      activity_id: activity.id,
      type: 'rcs',
      statut: 'failed',
      occurred_at: next_status_timestamp(activity, clock.now())
    })
  }
}

const process_rich_timeout = (
  job: Job,
  payload: Extract<BulkItemPayload, { kind: 'rich_rcs' }>
): void => {
  const db = new Database(datastore_path())
  db.run('BEGIN IMMEDIATE')
  try {
    const current = db
      .query<
        { payload: string; report_status: string; current_activity_id: number | null },
        [string]
      >(`SELECT payload, report_status, current_activity_id FROM bulk_jobs WHERE id = ?`)
      .get(job.id)
    const currentPayload = current ? (JSON.parse(current.payload) as BulkItemPayload) : null
    if (
      current?.report_status === 'in_progress' &&
      currentPayload?.kind === 'rich_rcs' &&
      currentPayload.stage === payload.stage &&
      currentPayload.nodeId === payload.nodeId
    ) {
      const code = payload.stage === 'rich_wait_reply' ? 'reply_timeout' : 'delivery_timeout'
      finalize_bulk_item_with_db(db, {
        jobId: job.id,
        status: 'ko',
        outcome: { code, node_id: payload.nodeId },
        currentActivityId: current.current_activity_id,
        completedAt: clock.now().toISOString(),
        payload: currentPayload
      })
    }
    db.run('COMMIT')
  } catch (error) {
    db.run('ROLLBACK')
    throw error
  } finally {
    db.close()
  }
}

export const process_job = async (job: Job): Promise<void> => {
  try {
    const payload = JSON.parse(job.payload) as BulkItemPayload
    if (payload.kind === 'fallback') {
      if (payload.stage === 'attempt') await process_fallback_attempt(job, payload)
      else process_fallback_status(job)
    } else if (payload.stage === 'rich_send') {
      await process_rich_send(job, payload)
    } else {
      process_rich_timeout(job, payload)
    }
  } catch (error) {
    const db = new Database(datastore_path())
    const current = db
      .query<{ payload: string }, [string]>('SELECT payload FROM bulk_jobs WHERE id = ?')
      .get(job.id)
    const payload = current ? (JSON.parse(current.payload) as BulkItemPayload) : null
    if (
      payload?.kind === 'rich_rcs' &&
      (payload.stage === 'rich_wait_delivery' || payload.stage === 'rich_wait_reply')
    ) {
      db.run('UPDATE bulk_jobs SET attempts = attempts + 1, last_error = ? WHERE id = ?', [
        error instanceof Error ? error.message : String(error),
        job.id
      ])
    } else {
      const delay = Math.min(60_000, 250 * 2 ** Math.min(job.attempts, 8))
      db.run(
        `UPDATE bulk_jobs
         SET attempts = attempts + 1, last_error = ?, run_at = ?
         WHERE id = ? AND report_status = 'in_progress'`,
        [
          error instanceof Error ? error.message : String(error),
          new Date(clock.now().getTime() + delay).toISOString(),
          job.id
        ]
      )
    }
    db.close()
  }
}
