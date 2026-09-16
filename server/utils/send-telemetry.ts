import { Database } from 'bun:sqlite'

import { activity_timestamp } from '../../shared/activites'
import { datastorePaths } from './paths'

export const TELEMETRY_URL = 'https://assistant.pierre-ia.org/telemetry'
const COLLECTOR_HOST = 'assistant.pierre-ia.org'

const instance_host = (): string => {
  const raw = Bun.env['HOST']?.trim()
  if (!raw) return 'unknown'
  try {
    return (raw.includes('://') ? new URL(raw) : new URL(`https://${raw}`)).hostname.toLowerCase()
  } catch {
    return raw.toLowerCase()
  }
}

export const persist_telemetry = (db: Database, host: string, event: string): void => {
  db.run(`INSERT INTO telemetry (recorded_at, host, event) VALUES (?, ?, ?)`, [
    activity_timestamp(),
    host,
    event
  ])
}

const forward_telemetry = (host: string, event: string): void => {
  if (host === COLLECTOR_HOST) return
  fetch(TELEMETRY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, event }),
    signal: AbortSignal.timeout(5000)
  }).catch(() => {})
}

/**
 * Records a local ping (HOST + event), then forwards it.
 * Pass `db` to persist on the caller's connection. Never throws.
 */
export const send_telemetry = (event: string, db?: Database): void => {
  const host = instance_host()
  try {
    if (db) persist_telemetry(db, host, event)
    else {
      using opened = new Database(datastorePaths().database)
      persist_telemetry(opened, host, event)
    }
  } catch {
    // Local write is a projection and must not fail the caller.
  }
  forward_telemetry(host, event)
}
