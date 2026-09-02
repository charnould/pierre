import { TZDate } from '@date-fns/tz'

import desktop_config from '../../../customization/desktop.ts'
import { parseCronExpression, type ParsedCron } from '../../../shared/automations'

function matchesCron(local: TZDate, cron: ParsedCron): boolean {
  if (local.getMinutes() !== cron.minute || local.getHours() !== cron.hour) return false
  if (cron.month !== null && local.getMonth() + 1 !== cron.month) return false
  if (cron.dom !== null && local.getDate() !== cron.dom) return false
  if (cron.dows !== null && !cron.dows.includes(local.getDay())) return false
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
  let cursor = new TZDate(after.getTime(), timezone)
  cursor = new TZDate(
    cursor.getFullYear(),
    cursor.getMonth(),
    cursor.getDate(),
    cursor.getHours(),
    cursor.getMinutes(),
    0,
    0,
    timezone
  )
  const afterMs = after.getTime()

  for (let i = 0; i < 60 * 24 * 370 * 2; i++) {
    if (matchesCron(cursor, parsed) && cursor.getTime() >= afterMs) {
      return new Date(cursor.getTime()).toISOString()
    }
    cursor = new TZDate(cursor.getTime() + 60_000, timezone)
  }
  throw new Error(`No next run found for cron=${cron} tz=${timezone}`)
}

export function org_timezone(): string {
  const tz = (desktop_config as { timezone?: string }).timezone
  return typeof tz === 'string' && tz.trim() ? tz.trim() : 'Europe/Paris'
}
