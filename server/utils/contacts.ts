import { Database } from 'bun:sqlite'

import parsePhoneNumberFromString from 'libphonenumber-js/max'
import { z } from 'zod'

import { activity_timestamp } from '../../shared/activites'
import { datastorePaths } from './paths'

export const CONTACTS_TABLE = 'contacts'

/** Months after a `sms_compatible` check before the cron retries RCS (ingest assumption). */
export const RCS_RECHECK_MONTHS = 6

/** Contact phone columns (tenant / client / candidate) — not staff. */
const CONTACT_PHONE_COLUMNS = new Set([
  'telephone_locataire',
  'telephone_client',
  'telephone_candidat'
])

export const is_contact_phone_column = (column: string): boolean =>
  CONTACT_PHONE_COLUMNS.has(column)

/** Contact email columns (tenant / client / candidate) — not staff. */
const CONTACT_EMAIL_COLUMNS = new Set(['email_locataire', 'email_client', 'email_candidat'])

export type TelephoneStatus = 'invalid' | 'sms_compatible' | 'rcs_compatible'
export type EmailStatus = 'invalid' | 'ok' | 'soft_bounce' | 'hard_bounce'
export type ContactStatus = TelephoneStatus | EmailStatus

export type ContactRow = {
  value: string
  status: ContactStatus
}

const TelephoneRowSchema = z.object({
  value: z.string().min(1),
  status: z.enum(['invalid', 'sms_compatible', 'rcs_compatible'])
})

const EmailRowSchema = z.object({
  value: z.string().min(1),
  status: z.enum(['invalid', 'ok', 'soft_bounce', 'hard_bounce'])
})

const EmailSyntaxSchema = z.email()

const datastore_path = (): string => datastorePaths().database

/**
 * Recovers a phone string from a spreadsheet cell.
 * Excel often stores `0611563959` as number `611563959` (leading 0 lost).
 */
export const phone_raw_from_cell = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    const digits = String(Math.trunc(Math.abs(value)))
    if (/^[1-9]\d{8}$/.test(digits)) return `0${digits}`
    return digits
  }
  const s = String(value).trim()
  return s === '' ? null : s
}

/**
 * Deterministic phone cleanup before libphonenumber-js:
 * trim → `00`→`+` → strip common separators. Unexpected characters are preserved
 * so malformed values cannot become valid through cleanup.
 */
export const clean_phone_digits = (raw: string): string => {
  let s = raw.trim()
  if (s.startsWith('00')) s = `+${s.slice(2)}`
  return s.replace(/[\s.\-()/]/g, '')
}

/** Normalize + classify a phone for snapshot rewrite and registry insert. */
export const normalize_telephone = (raw: unknown): { value: string; status: TelephoneStatus } => {
  const as_str = phone_raw_from_cell(raw)
  if (as_str === null) return { value: '', status: 'invalid' }

  const cleaned = clean_phone_digits(as_str)
  if (cleaned === '' || cleaned === '+') return { value: cleaned, status: 'invalid' }
  if (!/^\+?\d+$/.test(cleaned)) return { value: cleaned, status: 'invalid' }

  const phone = parsePhoneNumberFromString(cleaned, 'FR')
  if (!phone?.isValid()) return { value: cleaned, status: 'invalid' }

  const e164 = phone.format('E.164')
  const line_type = phone.getType()
  if (line_type === 'MOBILE' || line_type === 'FIXED_LINE_OR_MOBILE') {
    // Default RCS; an API may later downgrade to sms_compatible (INSERT-only preserves it).
    return { value: e164, status: 'rcs_compatible' }
  }
  return { value: e164, status: 'invalid' }
}

/** Normalize + classify an email (lowercase trim; syntax via Zod). */
export const normalize_email = (raw: unknown): { value: string; status: EmailStatus } => {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (value === '') return { value: '', status: 'invalid' }
  return {
    value,
    status: EmailSyntaxSchema.safeParse(value).success ? 'ok' : 'invalid'
  }
}

/** Validate a registry row with Zod (email vs phone by `@`). */
export const parse_contact_row = (row: { value: string; status: string }): ContactRow => {
  if (row.value.includes('@')) return EmailRowSchema.parse(row)
  return TelephoneRowSchema.parse(row)
}

/**
 * INSERT-only into `contacts`. Existing `value` keeps its `status` / `checked_at`
 * (ingest defaults mobiles to rcs_compatible; API may downgrade to sms_compatible
 * or set email bounce — re-ingest must not overwrite).
 */
/** `sms_compatible` skips RCS. Absent or `rcs_compatible` still tries RCS. */
export const mobile_channel = (e164: string): 'rcs' | 'sms' => {
  if (!e164) return 'rcs'
  const db = new Database(datastore_path(), { readonly: true })
  try {
    const row = db
      .query<{ status: string }, [string]>('SELECT status FROM contacts WHERE value = ?')
      .get(e164)
    return row?.status === 'sms_compatible' ? 'sms' : 'rcs'
  } finally {
    db.close()
  }
}

/** Remember that RCS failed for this phone. Re-ingest must not overwrite it. */
export const mark_sms_compatible = (db: Database, value: string, now: Date = new Date()): void => {
  if (!value || value.includes('@')) return
  const checked_at = activity_timestamp(now)
  db.run(
    `INSERT INTO contacts (value, status, checked_at) VALUES (?, 'sms_compatible', ?)
     ON CONFLICT(value) DO UPDATE SET status = 'sms_compatible', checked_at = excluded.checked_at`,
    [value, checked_at]
  )
}

export const insert_contact_if_absent = (
  db: Database,
  value: string,
  status: ContactStatus,
  checked_at: string = activity_timestamp()
): void => {
  if (value === '') return
  const row = parse_contact_row({ value, status })
  insert_parsed_contact_if_absent(db, row, checked_at)
}

const insert_parsed_contact_if_absent = (
  db: Database,
  row: ContactRow,
  checked_at: string = activity_timestamp()
): void => {
  db.run(
    `INSERT INTO contacts (value, status, checked_at) VALUES (?, ?, ?) ON CONFLICT(value) DO NOTHING`,
    [row.value, row.status, checked_at]
  )
}

/** Scan HLM rows for contact columns and insert-only into the registry. */
export const insert_contacts_from_rows = (
  db: Database,
  rows: ReadonlyArray<Record<string, unknown>>
): void => {
  for (const row of rows) {
    for (const col of CONTACT_PHONE_COLUMNS) {
      const cell = row[col]
      if (cell === null || cell === undefined || cell === '') continue
      const { value, status } = normalize_telephone(cell)
      if (value !== '') {
        insert_parsed_contact_if_absent(db, TelephoneRowSchema.parse({ value, status }))
      }
    }
    for (const col of CONTACT_EMAIL_COLUMNS) {
      const cell = row[col]
      if (cell === null || cell === undefined || cell === '') continue
      const { value, status } = normalize_email(cell)
      insert_contact_if_absent(db, value, status)
    }
  }
}

const months_ago = (months: number, from: Date): Date => {
  const date = new Date(from.getTime())
  date.setUTCMonth(date.getUTCMonth() - months)
  return date
}

/** Reset stale `sms_compatible` phones to `rcs_compatible` (same assumption as ingest). */
export const refresh_stale_sms_contacts = (db?: Database, now: Date = new Date()): number => {
  const run = (database: Database) => {
    const checked_at = activity_timestamp(now)
    const cutoff = activity_timestamp(months_ago(RCS_RECHECK_MONTHS, now))
    return database.run(
      `UPDATE contacts
       SET status = 'rcs_compatible', checked_at = ?
       WHERE status = 'sms_compatible'
         AND checked_at <= ?
         AND value NOT LIKE '%@%'`,
      [checked_at, cutoff]
    ).changes
  }
  if (db) return run(db)
  const opened = new Database(datastore_path())
  try {
    return run(opened)
  } finally {
    opened.close()
  }
}
