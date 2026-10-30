import { describe, expect, it } from 'bun:test'

import { normalize_sheet_value, parse_numeric_string } from '../../../utils/knowledge/ingest-files'

describe('parse_numeric_string', () => {
  it('parses european format with space thousands separator', () => {
    expect(parse_numeric_string('1 234,56')).toBe(1234.56)
  })

  it('parses european format with dot thousands and comma decimal', () => {
    expect(parse_numeric_string('1.234,56')).toBe(1234.56)
  })

  it('parses standard format with period decimal', () => {
    expect(parse_numeric_string('1234,56')).toBe(1234.56)
  })

  it('parses standard format with comma thousands and period decimal', () => {
    expect(parse_numeric_string('1,234.56')).toBe(1234.56)
  })

  it('parses plain integer', () => {
    expect(parse_numeric_string('1234')).toBe(1234)
  })

  it('parses negative number with comma decimal', () => {
    expect(parse_numeric_string('-3,5')).toBe(-3.5)
  })

  it('converts percentage to decimal', () => {
    expect(parse_numeric_string('25%')).toBe(0.25)
  })

  it('converts percentage with space before symbol', () => {
    expect(parse_numeric_string('25 %')).toBe(0.25)
  })

  it('strips euro symbol', () => {
    expect(parse_numeric_string('50 €')).toBe(50)
  })

  it('strips euro symbol with european thousands format', () => {
    expect(parse_numeric_string('1 234,56 €')).toBe(1234.56)
  })

  it('returns null for non-numeric string', () => {
    expect(parse_numeric_string('abc')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parse_numeric_string('')).toBeNull()
  })

  it('returns null for lone dash', () => {
    expect(parse_numeric_string('-')).toBeNull()
  })

  it('strips dollar symbol', () => {
    expect(parse_numeric_string('99$')).toBe(99)
  })

  it('strips pound symbol', () => {
    expect(parse_numeric_string('£1,234.56')).toBe(1234.56)
  })

  it('strips yen symbol', () => {
    expect(parse_numeric_string('¥500')).toBe(500)
  })

  it('strips rupee symbol', () => {
    expect(parse_numeric_string('₹1 000')).toBe(1000)
  })

  it('handles non-breaking space as thousands separator', () => {
    // \u00A0 is a non-breaking space, used as thousands separator in French locale
    expect(parse_numeric_string('1\u00A0234,56')).toBe(1234.56)
  })
})

describe('normalize_sheet_value', () => {
  it('formats a Date as YYYY-MM-DD in Europe/Paris timezone', () => {
    // 2026-05-20T00:00:00Z is 2026-05-20 02:00 in Paris (UTC+2) → same date
    expect(normalize_sheet_value(new Date('2026-05-20T00:00:00.000Z'))).toBe('2026-05-20')
  })

  it('formats a Date at UTC midnight correctly even when Paris is UTC+2', () => {
    // 2026-01-15T23:00:00Z is 2026-01-16 00:00 in Paris (UTC+1) → next day
    expect(normalize_sheet_value(new Date('2026-01-15T23:00:00.000Z'))).toBe('2026-01-16')
  })

  it('converts DD/MM/YYYY string to YYYY-MM-DD', () => {
    expect(normalize_sheet_value('20/05/2026')).toBe('2026-05-20')
  })

  it('converts DD/MM/YYYY string with leading zeros to YYYY-MM-DD', () => {
    expect(normalize_sheet_value('01/01/2024')).toBe('2024-01-01')
  })

  it('leaves plain strings unchanged', () => {
    expect(normalize_sheet_value('hello world')).toBe('hello world')
  })

  it('converts numeric strings to numbers', () => {
    expect(normalize_sheet_value('1 234,56')).toBe(1234.56)
  })

  it('normalizes contact phone columns before numeric parsing', () => {
    expect(normalize_sheet_value('06 11 56 39 59', 'telephone_locataire')).toBe('+33611563959')
    expect(normalize_sheet_value('+33611563959', 'telephone_client')).toBe('+33611563959')
    expect(normalize_sheet_value(611563959, 'telephone_candidat')).toBe('+33611563959')
    expect(normalize_sheet_value(142000000, 'telephone_client')).toBe('+33142000000')
    expect(normalize_sheet_value('', 'telephone_client')).toBeNull()
    expect(normalize_sheet_value('06abc11563959', 'telephone_client')).toBe('06abc11563959')
  })

  it('keeps code_postal as a five-digit string', () => {
    expect(normalize_sheet_value('01000', 'code_postal')).toBe('01000')
    expect(typeof normalize_sheet_value('01000', 'code_postal')).toBe('string')
  })

  it('pads numeric Excel code_postal values', () => {
    expect(normalize_sheet_value(1000, 'code_postal')).toBe('01000')
    expect(normalize_sheet_value('1000', 'Code Postal')).toBe('01000')
  })

  it('returns null for empty or invalid code_postal values', () => {
    expect(normalize_sheet_value('', 'code_postal')).toBeNull()
    expect(normalize_sheet_value(null, 'code_postal')).toBeNull()
    expect(normalize_sheet_value('75-001', 'code_postal')).toBeNull()
  })

  it('keeps code_insee as a string, including leading zeros', () => {
    expect(normalize_sheet_value('01053', 'code_insee')).toBe('01053')
    expect(typeof normalize_sheet_value('01053', 'code_insee')).toBe('string')
    expect(normalize_sheet_value(1053, 'code_insee')).toBe('1053')
  })

  it('keeps code_departement as a string, including Corsican identifiers', () => {
    expect(normalize_sheet_value('01', 'code_departement')).toBe('01')
    expect(normalize_sheet_value('2A', 'code_departement')).toBe('2A')
    expect(normalize_sheet_value(1, 'code_departement')).toBe('1')
  })

  it('returns null for empty strings', () => {
    expect(normalize_sheet_value('')).toBeNull()
  })

  it('returns null as-is', () => {
    expect(normalize_sheet_value(null)).toBeNull()
  })

  it('returns boolean values as-is', () => {
    expect(normalize_sheet_value(true)).toBe(true)
    expect(normalize_sheet_value(false)).toBe(false)
  })

  it('returns numeric values as-is', () => {
    expect(normalize_sheet_value(42)).toBe(42)
    expect(normalize_sheet_value(3.14)).toBe(3.14)
  })

  it('lowercases string values', () => {
    expect(normalize_sheet_value('HELLO WORLD')).toBe('hello world')
  })

  it('collapses multiple spaces in strings', () => {
    expect(normalize_sheet_value('foo   bar')).toBe('foo bar')
  })

  it('trims leading and trailing whitespace from strings', () => {
    expect(normalize_sheet_value('  bonjour  ')).toBe('bonjour')
  })
})
