import { parseCronExpression, type ParsedCron } from '../../../shared/automations'
import { type ZonedDateParts, zonedDateParts } from '../../../shared/zoned-date'

function matchesCron(local: ZonedDateParts, cron: ParsedCron): boolean {
  if (local.minute !== cron.minute || local.hour !== cron.hour) return false
  if (cron.month !== null && local.month !== cron.month) return false
  if (cron.dom !== null && local.day !== cron.dom) return false
  if (cron.dows !== null && !cron.dows.includes(local.weekday)) return false
  return true
}

/**
 * Next run instant (UTC ISO) at or after `after`, in org timezone wall-clock.
 * Catch-up: skip missed slots — next matching slot >= after.
 */
export function compute_next_run_at(
  cron: string,
  timezone: string,
  after: Date = new Date()
): string {
  const parsed = parseCronExpression(cron)
  let cursor = Math.floor(after.getTime() / 60_000) * 60_000
  const afterMs = after.getTime()

  for (let i = 0; i < 60 * 24 * 370 * 2; i++) {
    if (matchesCron(zonedDateParts(new Date(cursor), timezone), parsed) && cursor >= afterMs) {
      return new Date(cursor).toISOString()
    }
    cursor += 60_000
  }
  throw new Error(`No next run found for cron=${cron} tz=${timezone}`)
}
