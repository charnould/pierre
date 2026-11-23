import type { AutomationRecord } from '../../../shared/automations'
import { create_trusted_activity } from '../activities/write'
import {
  canManageCollaboratorResource,
  type CollaboratorActor,
  notificationRecipients
} from '../collaborator-access'
import { execute_automation } from './execute'
import {
  AutomationsError,
  claim_automation,
  claim_automation_manual,
  finalize_automation_run,
  get_automation,
  get_automation_raw,
  list_due_automation_ids,
  list_stuck_running_ids,
  renew_automation_lease,
  stop_running_automation
} from './store'

type ExecutorResult = {
  kind: 'report'
  contenu: string
}

export type AutomationExecutor = (
  automation: AutomationRecord,
  context: { runToken: string; signal: AbortSignal }
) => Promise<ExecutorResult>

let active_executor: AutomationExecutor | null = execute_automation
const active_runs = new Map<string, AbortController>()

export function abort_automation_run(id: string): void {
  active_runs.get(id)?.abort()
}

/** Test / future agent hook. */
export function set_automation_executor(executor: AutomationExecutor): void {
  active_executor = executor
}

export function reset_automation_executor(): void {
  active_executor = null
}

function notify_run(automation: AutomationRecord, result: ExecutorResult): void {
  const recipients = notificationRecipients(automation.owner, automation.mentions)
  create_trusted_activity(automation.owner, {
    contexte: 'automations',
    ref: automation.id,
    type: 'automation.reported',
    recipients,
    contenu: JSON.stringify({ version: 1, title: automation.name, note: result.contenu }),
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
  const abort = new AbortController()
  active_runs.set(id, abort)
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
    notify_run(automation, result)
    finalize_automation_run(id, run_token, 'success', options)
  } catch (error) {
    if (!abort.signal.aborted) {
      console.error('[automations.run]', error)
    }
    finalize_automation_run(id, run_token, 'error', options)
  } finally {
    if (active_runs.get(id) === abort) active_runs.delete(id)
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

/** Manual run by owner or administrator — allowed while paused (restores paused, no next_run_at). */
export async function run_automation_now(
  id: string,
  actor: CollaboratorActor
): Promise<AutomationRecord> {
  if (!active_executor) {
    throw new AutomationsError('Automation executor is not configured', 'unavailable')
  }
  const automation = get_automation_raw(id)
  if (!automation) {
    throw new AutomationsError('Automation not found', 'not_found')
  }
  if (!canManageCollaboratorResource(automation.owner, actor)) {
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
  if (!result) throw new AutomationsError('Automation not found', 'not_found')
  return result
}

export function stop_automation_run(id: string, actor: CollaboratorActor): AutomationRecord {
  const automation = get_automation(id, actor)
  if (!automation) {
    throw new AutomationsError('Automation not found', 'not_found')
  }
  if (!canManageCollaboratorResource(automation.owner, actor)) {
    throw new AutomationsError('Forbidden', 'forbidden')
  }
  abort_automation_run(id)
  stop_running_automation(id)
  return get_automation(id, actor)!
}
