import type {
  AutomationRecord,
  ReportAutomationConfig,
  TicketReplyAutomationConfig
} from '../../../shared/automations'
import { create_trusted_activity } from '../activities/write'
import {
  AutomationsError,
  claim_automation,
  claim_automation_manual,
  finalize_automation_run,
  get_automation_raw,
  list_due_automation_ids,
  list_stuck_running_ids,
  renew_automation_lease,
  trim_report_activities
} from './store'

type ExecutorResult =
  | {
      kind: 'report'
      contenu: string
    }
  | {
      kind: 'ticket_reply'
      summary: { total: number; generated: number; skipped: number; errors: number }
      tickets: Array<{
        id_reclamation: string
        outcome: 'generated' | 'skipped_existing_draft' | 'error'
        detail?: string
      }>
      contenu: string
    }

export type AutomationExecutor = (
  automation: AutomationRecord,
  context: { runToken: string; signal: AbortSignal }
) => Promise<ExecutorResult>

let active_executor: AutomationExecutor | null = null

/** Test / future agent hook. */
export function set_automation_executor(executor: AutomationExecutor): void {
  active_executor = executor
}

export function reset_automation_executor(): void {
  active_executor = null
}

function notify_run(automation: AutomationRecord, result: ExecutorResult, run_id: string): void {
  const recipients = [...new Set([automation.owner, ...automation.mentions])]
  const contenu =
    result.kind === 'report'
      ? result.contenu
      : JSON.stringify({
          titre: automation.name,
          contenu: result.contenu,
          automation_id: automation.id,
          run_id,
          summary: result.summary,
          tickets: result.tickets
        })
  create_trusted_activity(automation.owner, {
    contexte: 'automations',
    ref: automation.id,
    type: result.kind === 'report' ? 'automation_report' : 'ticket_reply',
    statut: 'logged',
    recipients,
    contenu,
    auteur: `automation:${automation.id}`
  })
}

async function execute_claimed(
  id: string,
  run_token: string,
  options: { restorePaused?: boolean } = {}
): Promise<AutomationRecord | null> {
  const automation = get_automation_raw(id)
  if (!automation) return null
  const executor = active_executor
  if (!executor) throw new AutomationsError('Automation executor is not configured', 'unavailable')
  const run_id = Bun.randomUUIDv7()
  const abort = new AbortController()
  const heartbeat = setInterval(() => {
    try {
      if (!renew_automation_lease(id, run_token)) abort.abort()
    } catch {
      abort.abort()
    }
  }, 30_000)
  try {
    const result = await executor(automation, { runToken: run_token, signal: abort.signal })
    if (abort.signal.aborted || !renew_automation_lease(id, run_token)) {
      throw new Error('Automation lease lost')
    }
    notify_run(automation, result, run_id)
    if (automation.type === 'report') {
      const max = (automation.config as ReportAutomationConfig).maxReports
      trim_report_activities(id, max, 'automation_report')
    } else {
      const max = (automation.config as TicketReplyAutomationConfig).maxItems
      trim_report_activities(id, max, 'ticket_reply')
    }
    finalize_automation_run(id, run_token, 'success', options)
  } catch {
    finalize_automation_run(id, run_token, 'error', options)
  } finally {
    clearInterval(heartbeat)
  }
  return get_automation_raw(id)
}

let scheduler_active = false

/** Reclaim crash-stuck `running` rows, then run all due automations. */
export async function run_due_automations(): Promise<void> {
  if (!active_executor || scheduler_active) return
  scheduler_active = true
  try {
    const dueBefore = new Date().toISOString()
    for (const stale of list_stuck_running_ids(dueBefore)) {
      finalize_automation_run(stale.id, stale.run_token, 'error', {
        leaseExpiredBefore: dueBefore
      })
    }
    const due = list_due_automation_ids(dueBefore)
    for (let offset = 0; offset < due.length; offset += 4) {
      await Promise.all(
        due.slice(offset, offset + 4).map(async (id) => {
          const run_token = claim_automation(id, dueBefore)
          if (run_token) await execute_claimed(id, run_token)
        })
      )
    }
  } finally {
    scheduler_active = false
  }
}

/** Manual run by owner — allowed while paused (restores paused, no next_run_at). */
export async function run_automation_now(id: string, owner: string): Promise<AutomationRecord> {
  if (!active_executor) {
    throw new AutomationsError('Automation executor is not configured', 'unavailable')
  }
  const automation = get_automation_raw(id)
  if (!automation) {
    throw new AutomationsError('Automation not found', 'not_found')
  }
  if (automation.owner.toLowerCase() !== owner.trim().toLowerCase()) {
    throw new AutomationsError('Forbidden', 'forbidden')
  }
  const restorePaused = automation.status === 'paused'
  if (automation.status === 'running') {
    throw new AutomationsError('Automation already running', 'conflict')
  }
  const run_token = claim_automation_manual(id)
  if (!run_token) {
    throw new AutomationsError('Automation already running', 'conflict')
  }
  const result = await execute_claimed(id, run_token, { restorePaused })
  return result!
}
