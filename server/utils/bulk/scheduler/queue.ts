import { openDatastore } from '../../datastore-db'
import {
  bulk_clock_overridden,
  bulk_now,
  type Clock,
  type Job,
  process_job,
  set_transport_clock_for_tests
} from './transport'

const RETRY_MS = 60_000

let timer: ReturnType<typeof setTimeout> | null = null
let drainPromise: Promise<void> | null = null
let stopped = false

export const set_bulk_clock_for_tests = (override: Clock | null): void => {
  if (timer) clearTimeout(timer)
  timer = null
  if (override) stopped = false
  set_transport_clock_for_tests(override)
}

export const drain_bulk_jobs = async (now?: Date): Promise<void> => {
  if (drainPromise) return drainPromise
  const run = async (): Promise<void> => {
    while (true) {
      let jobs: Job[]
      try {
        using db = openDatastore({ readonly: true })
        jobs = db
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
      } catch (error) {
        console.error('[bulk] lecture impossible', error)
        return
      }
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
  if (stopped || bulk_clock_overridden()) return
  try {
    using db = openDatastore({ readonly: true })
    const next =
      db
        .query<{ run_at: string }, []>(
          `SELECT run_at FROM bulk_jobs
           WHERE report_status = 'in_progress' AND run_at IS NOT NULL
           ORDER BY run_at LIMIT 1`
        )
        .get()?.run_at ?? null
    if (!next) return
    const delay = Math.min(
      2_147_483_647,
      Math.max(0, new Date(next).getTime() - bulk_now().getTime())
    )
    timer = setTimeout(() => {
      timer = null
      void drain_bulk_jobs()
    }, delay)
  } catch (error) {
    console.error('[bulk] réarmement impossible', error)
    timer = setTimeout(() => {
      timer = null
      arm_bulk_scheduler()
    }, RETRY_MS)
  }
}

export const start_bulk_scheduler = (): void => {
  stopped = false
  void drain_bulk_jobs()
}

export const stop_bulk_scheduler = (): void => {
  stopped = true
  if (timer) clearTimeout(timer)
  timer = null
}
