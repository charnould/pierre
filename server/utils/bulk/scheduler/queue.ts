import { Database } from 'bun:sqlite'

import {
  bulk_clock_overridden,
  bulk_now,
  datastore_path,
  process_job,
  set_transport_clock_for_tests,
  type Clock,
  type Job
} from './transport'

let timer: ReturnType<typeof setTimeout> | null = null
let drainPromise: Promise<void> | null = null

export const set_bulk_clock_for_tests = (override: Clock | null): void => {
  if (timer) clearTimeout(timer)
  timer = null
  set_transport_clock_for_tests(override)
}

export const drain_bulk_jobs = async (now?: Date): Promise<void> => {
  if (drainPromise) return drainPromise
  const run = async (): Promise<void> => {
    while (true) {
      const db = new Database(datastore_path(), { readonly: true })
      const jobs = db
        .query<Job, [string]>(
          `SELECT id, bulk_operation_id, execution_id, item_id, attempts,
                  current_activity_id, payload
           FROM bulk_jobs
           WHERE report_status = 'in_progress'
             AND run_at IS NOT NULL
             AND run_at <= ?
           ORDER BY run_at, id
           LIMIT 100`
        )
        .all((now ?? bulk_now()).toISOString())
      db.close()
      if (jobs.length === 0) break
      for (const job of jobs) await process_job(job)
    }
  }
  drainPromise = run()
  try {
    await drainPromise
  } finally {
    drainPromise = null
    arm_bulk_scheduler()
  }
}

export const arm_bulk_scheduler = (): void => {
  if (timer) clearTimeout(timer)
  timer = null
  if (bulk_clock_overridden()) return
  let next: string | null = null
  try {
    const db = new Database(datastore_path(), { readonly: true })
    next =
      db
        .query<{ run_at: string }, []>(
          `SELECT run_at FROM bulk_jobs
           WHERE report_status = 'in_progress' AND run_at IS NOT NULL
           ORDER BY run_at LIMIT 1`
        )
        .get()?.run_at ?? null
    db.close()
  } catch {
    return
  }
  if (!next) return
  const delay = Math.min(
    2_147_483_647,
    Math.max(0, new Date(next).getTime() - bulk_now().getTime())
  )
  timer = setTimeout(() => {
    timer = null
    void drain_bulk_jobs()
  }, delay)
}

export const start_bulk_scheduler = (): Promise<void> => drain_bulk_jobs()

export const stop_bulk_scheduler = (): void => {
  if (timer) clearTimeout(timer)
  timer = null
}
