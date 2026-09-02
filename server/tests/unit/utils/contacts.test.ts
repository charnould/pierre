import { Database } from 'bun:sqlite'
import { describe, expect, it } from 'bun:test'

import { activity_timestamp } from '../../../../shared/activites'
import {
  clean_phone_digits,
  insert_contact_if_absent,
  insert_contacts_from_rows,
  normalize_email,
  normalize_telephone,
  parse_contact_row,
  phone_raw_from_cell,
  RCS_RECHECK_MONTHS,
  refresh_stale_sms_contacts
} from '../../../utils/contacts'

const open_contacts_db = (): Database => {
  const db = new Database(':memory:')
  db.run(`
    CREATE TABLE contacts (
      value TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      checked_at TEXT NOT NULL
    )
  `)
  return db
}

describe('clean_phone_digits', () => {
  it('strips spaces', () => {
    expect(clean_phone_digits('06 11 56 39 59')).toBe('0611563959')
  })

  it('strips dots, dashes and parentheses', () => {
    expect(clean_phone_digits('+33 6 11-56.39.59')).toBe('+33611563959')
  })

  it('converts 00 prefix to +', () => {
    expect(clean_phone_digits('0033611563959')).toBe('+33611563959')
  })

  it('strips letters', () => {
    expect(clean_phone_digits('06abc11563959')).toBe('0611563959')
  })
})

describe('phone_raw_from_cell', () => {
  it('returns null for empty', () => {
    expect(phone_raw_from_cell(null)).toBeNull()
    expect(phone_raw_from_cell('')).toBeNull()
    expect(phone_raw_from_cell('   ')).toBeNull()
  })

  it('restores leading 0 when Excel stored mobile as 9-digit number', () => {
    expect(phone_raw_from_cell(611563959)).toBe('0611563959')
    expect(phone_raw_from_cell(711563959)).toBe('0711563959')
  })

  it('keeps other numbers as digit strings', () => {
    expect(phone_raw_from_cell(12345)).toBe('12345')
  })

  it('keeps string phones as-is (trimmed)', () => {
    expect(phone_raw_from_cell(' 06 11 56 39 59 ')).toBe('06 11 56 39 59')
  })
})

describe('normalize_telephone', () => {
  it('normalizes FR mobile with spaces to E.164 rcs_compatible', () => {
    expect(normalize_telephone('06 11 56 39 59')).toEqual({
      value: '+33611563959',
      status: 'rcs_compatible'
    })
  })

  it('normalizes already-E.164 mobile', () => {
    expect(normalize_telephone('+33611563959')).toEqual({
      value: '+33611563959',
      status: 'rcs_compatible'
    })
  })

  it('recovers Excel number then normalizes to E.164', () => {
    expect(normalize_telephone(611563959)).toEqual({
      value: '+33611563959',
      status: 'rcs_compatible'
    })
  })

  it('marks FR landline as invalid (not SMS/RCS usable)', () => {
    expect(normalize_telephone('01 42 00 00 00')).toEqual({
      value: '+33142000000',
      status: 'invalid'
    })
  })

  it('marks garbage as invalid with cleaned value', () => {
    expect(normalize_telephone('06abc')).toEqual({
      value: '06',
      status: 'invalid'
    })
  })

  it('accepts overseas mobile with country calling code', () => {
    expect(normalize_telephone('+262692123456')).toEqual({
      value: '+262692123456',
      status: 'rcs_compatible'
    })
  })
})

describe('normalize_email', () => {
  it('lowercases and trims valid email to ok', () => {
    expect(normalize_email('  Henri.Becquerel@Gmail.COM ')).toEqual({
      value: 'henri.becquerel@gmail.com',
      status: 'ok'
    })
  })

  it('marks malformed email as invalid but keeps normalized value', () => {
    expect(normalize_email('pas-un-email')).toEqual({
      value: 'pas-un-email',
      status: 'invalid'
    })
  })
})

describe('parse_contact_row', () => {
  it('accepts phone statuses', () => {
    expect(parse_contact_row({ value: '+33611563959', status: 'sms_compatible' })).toEqual({
      value: '+33611563959',
      status: 'sms_compatible'
    })
  })

  it('accepts email statuses', () => {
    expect(parse_contact_row({ value: 'a@b.co', status: 'soft_bounce' })).toEqual({
      value: 'a@b.co',
      status: 'soft_bounce'
    })
  })

  it('rejects phone status on email value', () => {
    expect(() => parse_contact_row({ value: 'a@b.co', status: 'sms_compatible' })).toThrow()
  })

  it('rejects email status on phone value', () => {
    expect(() => parse_contact_row({ value: '+33611563959', status: 'soft_bounce' })).toThrow()
  })
})

describe('contacts registry insert-only', () => {
  const read = (db: Database, value: string): { status: string; checked_at: string } | null =>
    db
      .query<{ status: string; checked_at: string }, [string]>(
        'SELECT status, checked_at FROM contacts WHERE value = ?'
      )
      .get(value) ?? null

  it('inserts mobile as rcs_compatible with checked_at', () => {
    const db = open_contacts_db()
    insert_contacts_from_rows(db, [
      { telephone_locataire: '06 11 56 39 59', email_locataire: 'henri@gmail.com' }
    ])
    const phone = read(db, '+33611563959')
    const email = read(db, 'henri@gmail.com')
    expect(phone?.status).toBe('rcs_compatible')
    expect(phone?.checked_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    expect(email?.status).toBe('ok')
  })

  it('does not overwrite existing status on conflict', () => {
    const db = open_contacts_db()
    insert_contact_if_absent(db, '+33611563959', 'sms_compatible', '2020-01-01T00:00:00')
    insert_contacts_from_rows(db, [{ telephone_locataire: '+33611563959' }])
    expect(read(db, '+33611563959')).toEqual({
      status: 'sms_compatible',
      checked_at: '2020-01-01T00:00:00'
    })
  })

  it('preserves API sms_compatible downgrade across re-ingest', () => {
    const db = open_contacts_db()
    insert_contacts_from_rows(db, [{ telephone_locataire: '06 11 56 39 59' }])
    expect(read(db, '+33611563959')?.status).toBe('rcs_compatible')
    db.run(`UPDATE contacts SET status = ?, checked_at = ? WHERE value = ?`, [
      'sms_compatible',
      '2024-01-01T00:00:00',
      '+33611563959'
    ])
    insert_contacts_from_rows(db, [{ telephone_locataire: '+33611563959' }])
    expect(read(db, '+33611563959')).toEqual({
      status: 'sms_compatible',
      checked_at: '2024-01-01T00:00:00'
    })
  })

  it('adds a new email when the tenant changes address', () => {
    const db = open_contacts_db()
    insert_contacts_from_rows(db, [{ email_client: 'old@example.com' }])
    insert_contacts_from_rows(db, [{ email_client: 'new@example.com' }])
    expect(read(db, 'old@example.com')?.status).toBe('ok')
    expect(read(db, 'new@example.com')?.status).toBe('ok')
  })

  it('ignores staff-like columns not in contact sets', () => {
    const db = open_contacts_db()
    insert_contacts_from_rows(db, [
      { gestionnaire: 'collab@bailleur.fr', telephone_autre: '0611563959' }
    ])
    const count = db.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM contacts').get()?.n
    expect(count).toBe(0)
  })

  it('stores invalid contacts in the registry', () => {
    const db = open_contacts_db()
    insert_contacts_from_rows(db, [{ telephone_candidat: '06xx', email_candidat: 'bad' }])
    expect(read(db, 'bad')?.status).toBe('invalid')
    expect(read(db, '06')?.status).toBe('invalid')
  })
})

describe('refresh_stale_sms_contacts', () => {
  const now = new Date('2026-08-22T12:00:00.000Z')
  const stale = activity_timestamp(
    new Date(Date.UTC(2026, 8 - 1 - RCS_RECHECK_MONTHS, 22, 12, 0, 0))
  )
  const fresh = activity_timestamp(new Date('2026-07-22T12:00:00.000Z'))
  const expected_checked_at = activity_timestamp(now)

  const read = (db: Database, value: string) =>
    db
      .query<{ status: string; checked_at: string }, [string]>(
        'SELECT status, checked_at FROM contacts WHERE value = ?'
      )
      .get(value)

  it('resets sms_compatible phones older than 6 months to rcs_compatible', () => {
    const db = open_contacts_db()
    insert_contact_if_absent(db, '+33611111111', 'sms_compatible', stale)
    expect(refresh_stale_sms_contacts(db, now)).toBe(1)
    expect(read(db, '+33611111111')).toEqual({
      status: 'rcs_compatible',
      checked_at: expected_checked_at
    })
  })

  it('leaves recent sms_compatible phones untouched', () => {
    const db = open_contacts_db()
    insert_contact_if_absent(db, '+33622222222', 'sms_compatible', fresh)
    expect(refresh_stale_sms_contacts(db, now)).toBe(0)
    expect(read(db, '+33622222222')).toEqual({
      status: 'sms_compatible',
      checked_at: fresh
    })
  })

  it('does not touch emails, invalid phones, or already rcs_compatible rows', () => {
    const db = open_contacts_db()
    insert_contact_if_absent(db, 'old@example.com', 'hard_bounce', stale)
    insert_contact_if_absent(db, '+33142000000', 'invalid', stale)
    insert_contact_if_absent(db, '+33633333333', 'rcs_compatible', stale)
    expect(refresh_stale_sms_contacts(db, now)).toBe(0)
    expect(read(db, 'old@example.com')?.status).toBe('hard_bounce')
    expect(read(db, '+33142000000')?.status).toBe('invalid')
    expect(read(db, '+33633333333')).toEqual({
      status: 'rcs_compatible',
      checked_at: stale
    })
  })

  it('resets a phone exactly at the 6-month cutoff', () => {
    const db = open_contacts_db()
    const cutoff = activity_timestamp(new Date('2026-02-22T12:00:00.000Z'))
    insert_contact_if_absent(db, '+33644444444', 'sms_compatible', cutoff)
    expect(refresh_stale_sms_contacts(db, now)).toBe(1)
    expect(read(db, '+33644444444')?.status).toBe('rcs_compatible')
  })
})
