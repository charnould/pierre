import { Database } from 'bun:sqlite'

import {
  decodeCronToSchedule,
  encodeScheduleToCron,
  parseUserPreferences,
  type AutomationConfig,
  type AutomationLifecycleStatus,
  type AutomationRecord,
  type AutomationRunStatus,
  type AutomationType,
  type CreateAutomationBody,
  type PatchAutomationBody,
  type ReportAutomationConfig,
  type TicketReplyAutomationConfig,
  type UserPreferences
} from '../../../shared/automations'
import { build_rattachement, login_from_email } from '../activities/rows'
import { datastorePaths } from '../paths'
import { format_automation_prompt } from './format-prompt'
import { compute_next_run_at, org_timezone } from './schedule'
import { automation_schedule_error, AutomationConfigSchema } from './schemas'

const datastore_path = (): string => datastorePaths().database
const open_db = (): Database => {
  const db = new Database(datastore_path())
  db.run('PRAGMA busy_timeout = 5000')
  return db
}

export class AutomationsError extends Error {
  constructor(
    message: string,
    readonly code: 'not_found' | 'forbidden' | 'invalid' | 'conflict' | 'unavailable' = 'invalid'
  ) {
    super(message)
    this.name = 'AutomationsError'
  }
}

type AutomationDbRow = {
  id: string
  type: string
  name: string
  description: string
  status: string
  owner: string
  mentions: string
  cron: string
  next_run_at: string | null
  last_run_at: string | null
  last_run_status: string | null
  run_token: string | null
  lease_expires_at: string | null
  config: string
}

function parse_mentions_json(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

const canonical_mentions = (db: Database, values: readonly string[]): string[] => {
  const emails = db
    .query<{ email: string }, []>('SELECT lower(email) AS email FROM users')
    .all()
    .map((row) => row.email)
  const byLogin = new Map<string, string[]>()
  for (const email of emails) {
    const login = login_from_email(email)
    byLogin.set(login, [...(byLogin.get(login) ?? []), email])
  }
  return [
    ...new Set(
      values.map((value) => {
        const normalized = value.trim().toLowerCase()
        if (emails.includes(normalized)) return normalized
        const matches = byLogin.get(normalized) ?? []
        if (matches.length !== 1) {
          throw new AutomationsError(`Unknown or ambiguous mention: ${value}`)
        }
        return matches[0]!
      })
    )
  ]
}

function row_to_record(row: AutomationDbRow, pinned = false): AutomationRecord {
  const config = AutomationConfigSchema.parse(JSON.parse(row.config))
  return {
    id: row.id,
    type: row.type as AutomationType,
    name: row.name,
    description: row.description,
    status: row.status as AutomationLifecycleStatus,
    owner: row.owner,
    mentions: parse_mentions_json(row.mentions),
    cron: row.cron,
    next_run_at: row.next_run_at,
    last_run_at: row.last_run_at,
    last_run_status: (row.last_run_status as AutomationRunStatus | null) ?? null,
    config,
    pinned
  }
}

async function config_from_create(body: CreateAutomationBody): Promise<AutomationConfig> {
  if (body.type === 'report') {
    return { prompt: await format_automation_prompt(body.prompt), maxReports: body.maxReports ?? 6 }
  }
  return {
    skillId: 'ticket.answer-ticket',
    channel: body.channel ?? 'email',
    ticketFilters: body.ticketFilters ?? { rules: [] },
    maxItems: body.maxItems ?? 20
  }
}

const get_user_preferences_with_db = (db: Database, email: string): UserPreferences => {
  const row = db
    .query<{ preferences: string | null }, [string]>(
      'SELECT preferences FROM users WHERE lower(email) = ? LIMIT 1'
    )
    .get(email.toLowerCase().trim())
  return parseUserPreferences(row?.preferences)
}

const set_user_preferences_with_db = (
  db: Database,
  email: string,
  preferences: UserPreferences
): void => {
  db.run('UPDATE users SET preferences = ? WHERE lower(email) = ?', [
    JSON.stringify(preferences),
    email.toLowerCase().trim()
  ])
}

export function get_user_preferences(email: string): UserPreferences {
  const db = open_db()
  try {
    return get_user_preferences_with_db(db, email)
  } finally {
    db.close()
  }
}

export function set_user_preferences(email: string, preferences: UserPreferences): void {
  const db = open_db()
  try {
    set_user_preferences_with_db(db, email, preferences)
  } finally {
    db.close()
  }
}

export function patch_user_preferences(
  email: string,
  patch: Partial<UserPreferences>
): UserPreferences {
  const db = open_db()
  try {
    return db
      .transaction(() => {
        const current = get_user_preferences_with_db(db, email)
        const next = { ...current, ...patch }
        set_user_preferences_with_db(db, email, next)
        return next
      })
      .immediate()
  } finally {
    db.close()
  }
}

function purge_pin_from_all_users(db: Database, automation_id: string): void {
  const rows = db
    .query<{ email: string; preferences: string | null }, []>(
      'SELECT email, preferences FROM users'
    )
    .all()
  for (const row of rows) {
    const prefs = parseUserPreferences(row.preferences)
    if (!prefs.pinned_automation_ids.includes(automation_id)) continue
    const next: UserPreferences = {
      ...prefs,
      pinned_automation_ids: prefs.pinned_automation_ids.filter((id) => id !== automation_id)
    }
    db.run('UPDATE users SET preferences = ? WHERE email = ?', [JSON.stringify(next), row.email])
  }
}

function can_see(row: AutomationDbRow, principal: string): boolean {
  const normalized = principal.trim().toLowerCase()
  if (row.owner.toLowerCase() === normalized) return true
  return parse_mentions_json(row.mentions).includes(normalized)
}

export function list_automations(login: string, email: string): AutomationRecord[] {
  const prefs = get_user_preferences(email)
  const pinned = new Set(prefs.pinned_automation_ids)
  const db = open_db()
  try {
    const rows = db.query<AutomationDbRow, []>('SELECT * FROM automations').all()
    return rows
      .filter((row) => can_see(row, login))
      .map((row) => row_to_record(row, pinned.has(row.id)))
  } finally {
    db.close()
  }
}

export function get_automation(id: string, login: string, email?: string): AutomationRecord | null {
  const db = open_db()
  try {
    const row = db
      .query<AutomationDbRow, [string]>('SELECT * FROM automations WHERE id = ? LIMIT 1')
      .get(id)
    if (!row || !can_see(row, login)) return null
    const pinned = email ? get_user_preferences(email).pinned_automation_ids.includes(id) : false
    return row_to_record(row, pinned)
  } finally {
    db.close()
  }
}

export async function create_automation(
  owner: string,
  body: CreateAutomationBody
): Promise<AutomationRecord> {
  const cron = encodeScheduleToCron({
    frequency: body.frequency,
    frequencyDay: body.frequencyDay,
    frequencyTime: body.frequencyTime
  })
  const config = await config_from_create(body)
  const canonicalOwner = owner.includes('@') ? owner.trim().toLowerCase() : owner
  const id = Bun.randomUUIDv7()
  const next_run_at = compute_next_run_at(cron, org_timezone())
  const db = open_db()
  try {
    const mentions = canonical_mentions(db, body.mentions ?? [])
    db.run(
      `INSERT INTO automations (
         id, type, name, description, status, owner, mentions, cron,
         next_run_at, last_run_at, last_run_status, config
       ) VALUES (?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, NULL, NULL, ?)`,
      [
        id,
        body.type,
        body.name,
        body.description ?? '',
        canonicalOwner,
        JSON.stringify(mentions),
        cron,
        next_run_at,
        JSON.stringify(config)
      ]
    )
  } finally {
    db.close()
  }
  return get_automation(id, canonicalOwner)!
}

export async function update_automation(
  id: string,
  owner: string,
  patch: PatchAutomationBody
): Promise<AutomationRecord> {
  const existing = get_automation(id, owner)
  if (!existing) throw new AutomationsError('Automation not found', 'not_found')
  if (existing.owner.toLowerCase() !== owner.trim().toLowerCase()) {
    throw new AutomationsError('Forbidden', 'forbidden')
  }
  if (existing.status === 'running') {
    throw new AutomationsError('Automation already running', 'conflict')
  }

  const scheduleFromCron = decodeCronToSchedule(existing.cron)
  const frequency = patch.frequency ?? scheduleFromCron.frequency
  const frequencyDay =
    patch.frequencyDay !== undefined ? patch.frequencyDay : scheduleFromCron.frequencyDay
  const frequencyTime = patch.frequencyTime ?? scheduleFromCron.frequencyTime
  const scheduleError = automation_schedule_error(frequency, frequencyDay)
  if (scheduleError) throw new AutomationsError(scheduleError)
  const scheduleChanged =
    patch.frequency !== undefined ||
    patch.frequencyDay !== undefined ||
    patch.frequencyTime !== undefined

  const cron = scheduleChanged
    ? encodeScheduleToCron({ frequency, frequencyDay, frequencyTime })
    : existing.cron

  let status = existing.status
  if (patch.status === 'paused') status = 'paused'
  if (patch.status === 'scheduled') status = 'scheduled'
  // Don't allow PATCH to set running

  let next_run_at = existing.next_run_at
  if (status === 'paused') {
    next_run_at = null
  } else if (status === 'scheduled' && (scheduleChanged || patch.status === 'scheduled')) {
    next_run_at = compute_next_run_at(cron, org_timezone())
  }

  let config = existing.config
  let trimReportsTo: number | null = null
  if (existing.type === 'report') {
    if (
      patch.channel !== undefined ||
      patch.ticketFilters !== undefined ||
      patch.maxItems !== undefined
    ) {
      throw new AutomationsError('Ticket reply fields are invalid for report automations')
    }
    const report = config as ReportAutomationConfig
    const nextMax = patch.maxReports ?? report.maxReports
    config = {
      prompt:
        patch.prompt !== undefined ? await format_automation_prompt(patch.prompt) : report.prompt,
      maxReports: nextMax
    }
    if (patch.maxReports !== undefined && patch.maxReports < report.maxReports) {
      trimReportsTo = patch.maxReports
    }
  } else {
    if (patch.prompt !== undefined || patch.maxReports !== undefined) {
      throw new AutomationsError('Report fields are invalid for ticket reply automations')
    }
    const reply = config as TicketReplyAutomationConfig
    config = {
      skillId: 'ticket.answer-ticket',
      channel: patch.channel ?? reply.channel,
      ticketFilters: patch.ticketFilters ?? reply.ticketFilters,
      maxItems: patch.maxItems ?? reply.maxItems
    }
  }

  const db = open_db()
  try {
    db.transaction(() => {
      const mentions = patch.mentions ? canonical_mentions(db, patch.mentions) : existing.mentions
      const updated = db.run(
        `UPDATE automations SET
           name = ?, description = ?, status = ?, mentions = ?, cron = ?,
           next_run_at = ?, config = ?
         WHERE id = ? AND owner = ? AND status <> 'running'`,
        [
          patch.name ?? existing.name,
          patch.description ?? existing.description,
          status,
          JSON.stringify(mentions),
          cron,
          next_run_at,
          JSON.stringify(config),
          id,
          owner.trim().toLowerCase()
        ]
      )
      if (updated.changes === 0) throw new AutomationsError('Automation changed', 'conflict')
    }).immediate()
  } finally {
    db.close()
  }
  if (trimReportsTo !== null) trim_report_activities(id, trimReportsTo)
  return get_automation(id, owner)!
}

export function delete_automation(id: string, owner: string): void {
  const existing = get_automation(id, owner)
  if (!existing) throw new AutomationsError('Automation not found', 'not_found')
  if (existing.owner.toLowerCase() !== owner.trim().toLowerCase()) {
    throw new AutomationsError('Forbidden', 'forbidden')
  }
  if (existing.status === 'running') {
    throw new AutomationsError('Automation already running', 'conflict')
  }
  const db = open_db()
  try {
    db.transaction(() => {
      const deleted = db.run(
        `DELETE FROM automations
         WHERE id = ? AND owner = ? AND status <> 'running'`,
        [id, owner.trim().toLowerCase()]
      )
      if (deleted.changes === 0) throw new AutomationsError('Automation changed', 'conflict')
      purge_pin_from_all_users(db, id)
    }).immediate()
  } finally {
    db.close()
  }
}

export function set_automation_pin(
  id: string,
  login: string,
  email: string,
  pinned: boolean
): AutomationRecord {
  const db = open_db()
  try {
    return db
      .transaction(() => {
        const row = db
          .query<AutomationDbRow, [string]>('SELECT * FROM automations WHERE id = ? LIMIT 1')
          .get(id)
        if (!row || !can_see(row, login)) {
          throw new AutomationsError('Automation not found', 'not_found')
        }
        const prefs = get_user_preferences_with_db(db, email)
        const set = new Set(prefs.pinned_automation_ids)
        if (pinned) set.add(id)
        else set.delete(id)
        set_user_preferences_with_db(db, email, { ...prefs, pinned_automation_ids: [...set] })
        return row_to_record(row, pinned)
      })
      .immediate()
  } finally {
    db.close()
  }
}

export function trim_report_activities(
  automation_id: string,
  maxReports: number,
  type: 'automation_report' | 'ticket_reply' = 'automation_report'
): void {
  const rattachement = build_rattachement('automations', automation_id)
  const db = open_db()
  try {
    db.run(
      `DELETE FROM activites
       WHERE id IN (
         SELECT id FROM activites
         WHERE rattachement = ? AND type = ?
         ORDER BY date_creation DESC, id DESC
         LIMIT -1 OFFSET ?
       )`,
      [rattachement, type, Math.max(0, maxReports)]
    )
  } finally {
    db.close()
  }
}

export function list_due_automation_ids(nowIso: string = new Date().toISOString()): string[] {
  const db = open_db()
  try {
    return db
      .query<{ id: string }, [string]>(
        `SELECT id FROM automations
         WHERE status = 'scheduled'
           AND next_run_at IS NOT NULL
           AND next_run_at <= ?`
      )
      .all(nowIso)
      .map((r) => r.id)
  } finally {
    db.close()
  }
}

export function list_stuck_running_ids(
  nowIso: string = new Date().toISOString()
): Array<{ id: string; run_token: string }> {
  const db = open_db()
  try {
    return db
      .query<{ id: string; run_token: string }, [string]>(
        `SELECT id, run_token FROM automations
         WHERE status = 'running'
           AND run_token IS NOT NULL
           AND lease_expires_at <= ?`
      )
      .all(nowIso)
  } finally {
    db.close()
  }
}

const lease_expiry = (): string => new Date(Date.now() + 2 * 60_000).toISOString()

/** Claim for scheduler: scheduled → running. Returns a fencing token. */
export function claim_automation(
  id: string,
  due_before: string = new Date().toISOString()
): string | null {
  const db = open_db()
  try {
    const token = Bun.randomUUIDv7()
    const result = db.run(
      `UPDATE automations
       SET status = 'running', run_token = ?, lease_expires_at = ?
       WHERE id = ? AND status = 'scheduled'
         AND next_run_at IS NOT NULL AND next_run_at <= ?`,
      [token, lease_expiry(), id, due_before]
    )
    return result.changes > 0 ? token : null
  } finally {
    db.close()
  }
}

/** Force claim for manual run (owner): any non-running → running. */
export function claim_automation_manual(id: string): string | null {
  const db = open_db()
  try {
    const token = Bun.randomUUIDv7()
    const result = db.run(
      `UPDATE automations
       SET status = 'running', run_token = ?, lease_expires_at = ?
       WHERE id = ? AND status IN ('scheduled', 'paused')`,
      [token, lease_expiry(), id]
    )
    return result.changes > 0 ? token : null
  } finally {
    db.close()
  }
}

export function renew_automation_lease(id: string, run_token: string): boolean {
  const db = open_db()
  try {
    return (
      db.run(
        `UPDATE automations SET lease_expires_at = ?
         WHERE id = ? AND status = 'running' AND run_token = ?`,
        [lease_expiry(), id, run_token]
      ).changes > 0
    )
  } finally {
    db.close()
  }
}

export function finalize_automation_run(
  id: string,
  run_token: string,
  outcome: AutomationRunStatus,
  options: { restorePaused?: boolean; leaseExpiredBefore?: string } = {}
): boolean {
  const db = open_db()
  try {
    return db
      .transaction(() => {
        const row = db
          .query<AutomationDbRow, [string, string]>(
            `SELECT * FROM automations
           WHERE id = ? AND status = 'running' AND run_token = ? LIMIT 1`
          )
          .get(id, run_token)
        if (
          !row ||
          (options.leaseExpiredBefore &&
            (!row.lease_expires_at || row.lease_expires_at > options.leaseExpiredBefore))
        ) {
          return false
        }
        const now = new Date().toISOString()
        const status: AutomationLifecycleStatus = options.restorePaused ? 'paused' : 'scheduled'
        const next_run_at =
          status === 'scheduled'
            ? compute_next_run_at(row.cron, org_timezone(), new Date(now))
            : null
        return (
          db.run(
            `UPDATE automations SET
             status = ?, last_run_at = ?, last_run_status = ?, next_run_at = ?,
             run_token = NULL, lease_expires_at = NULL
           WHERE id = ? AND run_token = ?`,
            [status, now, outcome, next_run_at, id, run_token]
          ).changes > 0
        )
      })
      .immediate()
  } finally {
    db.close()
  }
}

export function get_automation_raw(id: string): AutomationRecord | null {
  const db = open_db()
  try {
    const row = db
      .query<AutomationDbRow, [string]>('SELECT * FROM automations WHERE id = ? LIMIT 1')
      .get(id)
    return row ? row_to_record(row) : null
  } finally {
    db.close()
  }
}
