import * as fs from 'node:fs'
import { Readable } from 'node:stream'

import * as XLSX from 'xlsx'
import * as cpexcel from 'xlsx/dist/cpexcel.full.mjs'

import { normalize_knowledge_name } from '../../../shared/knowledge'
import { zonedDateParts } from '../../../shared/zoned-date'
import { is_contact_phone_column, normalize_telephone } from '../contacts'
import {
  is_code_postal_column,
  is_keep_as_text_column,
  normalize_code_postal,
  stringify_identifier
} from './codes-postaux'
import type { DataRow } from './sqlite-table-import'

const TIMEZONE = 'Europe/Paris'

XLSX.set_fs(fs)
XLSX.set_cptable(cpexcel)
XLSX.stream.set_readable(Readable)

/**
 * Normalizes a spreadsheet column header key (lowercase + trimmed).
 *
 * @param key - Raw column header from the spreadsheet.
 */
const normalize_sheet_key = (key: string): string => normalize_knowledge_name(key)

/**
 * Attempts to parse a cleaned string as a numeric value.
 *
 * Handles:
 * - European format with comma decimal separator: `"1 234,56"` → `1234.56`
 * - Dot-thousands + comma decimal: `"1.234,56"` → `1234.56`
 * - Standard format with period decimal: `"1,234.56"` → `1234.56`
 * - Plain integers: `"1234"` → `1234`
 * - Percentages: `"25 %"` → `0.25`
 * - Currency symbols stripped: `"1 234,56 €"` → `1234.56`
 *
 * @param s - Already-trimmed, lowercased string (post basic normalization).
 * @returns A finite `number`, or `null` if `s` is not a recognizable numeric string.
 */
export const parse_numeric_string = (s: string): number | null => {
  let str = s

  // Detect and strip trailing percentage sign
  const is_percent = str.endsWith('%')
  if (is_percent) str = str.slice(0, -1).trim()

  // Strip common currency symbols and surrounding whitespace
  str = str.replace(/[€$£¥₹]/g, '').trim()

  // Remove all whitespace (thousands separators such as spaces or non-breaking spaces)
  str = str.replace(/[\s\u00A0]/g, '')

  if (str === '' || str === '-') return null

  const last_comma = str.lastIndexOf(',')
  const last_period = str.lastIndexOf('.')

  if (last_comma > last_period) {
    // Comma is the decimal separator (e.g. "1.234,56" or "1234,56")
    str = str.replace(/\./g, '').replace(',', '.')
  } else if (last_period > last_comma) {
    // Period is the decimal separator (e.g. "1,234.56" or "1234.56")
    str = str.replace(/,/g, '')
  }
  // No separator → plain integer string, nothing to change

  // Validate that only numeric characters remain
  if (!/^-?\d+(\.\d+)?$/.test(str)) return null

  const num = Number(str)
  if (!Number.isFinite(num)) return null

  return is_percent ? num / 100 : num
}

/**
 * Normalizes a spreadsheet cell value:
 * - Dates are formatted as `YYYY-MM-DD` strings in the Europe/Paris timezone.
 * - Strings are trimmed, whitespace-collapsed, and lowercased.
 *   Strings matching `DD/MM/YYYY` are converted to `YYYY-MM-DD`.
 *   If the result looks like a number (including European formats, %, currency symbols),
 *   it is converted to a JS `number`; empty strings become `null`.
 * - Other values are returned as-is.
 *
 * @param value - Raw cell value from the spreadsheet.
 * @param column_key - Optional column name, used to preserve identifier columns as text.
 */
export const normalize_sheet_value = (value: unknown, column_key?: string): unknown => {
  const key = column_key ?? ''
  if (is_contact_phone_column(key)) {
    const { value: telephone } = normalize_telephone(value)
    return telephone || null
  }
  if (is_keep_as_text_column(key)) {
    return is_code_postal_column(key) ? normalize_code_postal(value) : stringify_identifier(value)
  }

  if (value instanceof Date) {
    const { year, month, day } = zonedDateParts(value, TIMEZONE)
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  if (typeof value === 'string') {
    const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase()
    if (normalized === '') return null
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
      const [dd, mm, yyyy] = normalized.split('/')
      return `${yyyy}-${mm}-${dd}`
    }
    const as_number = parse_numeric_string(normalized)
    return as_number !== null ? as_number : normalized
  }
  return value
}

export class KnowledgeCsvError extends Error {
  constructor(
    readonly code:
      | 'invalid_csv_separator'
      | 'invalid_csv_header'
      | 'duplicate_csv_header'
      | 'missing_csv_header'
      | 'invalid_csv',
    message: string
  ) {
    super(message)
    this.name = 'KnowledgeCsvError'
  }
}

export type ParsedTable = { columns: string[]; rows: DataRow[] }

export const parseKnowledgeCsv = (text: string): ParsedTable => {
  if (text.startsWith('\uFEFF')) text = text.slice(1)

  const workbook = XLSX.read(text, { type: 'string', FS: ';', raw: true })
  const sheetName = workbook.SheetNames[0]
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined
  if (!sheet) throw new KnowledgeCsvError('missing_csv_header', 'Le CSV est vide.')

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false
  })
  const headerRow = matrix[0]
  if (!headerRow || headerRow.length === 0) {
    throw new KnowledgeCsvError('missing_csv_header', 'Le CSV est vide.')
  }

  const rawHeaders = headerRow.map((cell) => (cell == null ? '' : String(cell)))
  if (rawHeaders.length === 1 && rawHeaders[0]!.includes(',')) {
    throw new KnowledgeCsvError('invalid_csv_separator', 'Le séparateur CSV doit être « ; ».')
  }

  const columns = rawHeaders.map(normalize_sheet_key)
  if (columns.some((column) => !column)) {
    throw new KnowledgeCsvError('invalid_csv_header', 'Chaque colonne doit avoir un nom.')
  }
  if (new Set(columns).size !== columns.length) {
    throw new KnowledgeCsvError(
      'duplicate_csv_header',
      'Les noms de colonnes doivent être uniques.'
    )
  }

  const rows = matrix.slice(1).flatMap((record) => {
    const cells = columns.map((_, index) => record[index] ?? null)
    if (cells.every((cell) => cell === null || String(cell).trim() === '')) return []
    return [
      Object.fromEntries(
        columns.map((column, index) => [column, normalize_sheet_value(cells[index], column)])
      )
    ]
  })

  return { columns, rows }
}

export const loadKnowledgeCsv = async (path: string): Promise<ParsedTable> => {
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(await Bun.file(path).bytes())
  } catch {
    throw new KnowledgeCsvError('invalid_csv', 'Le fichier n’est pas encodé en UTF-8.')
  }
  return parseKnowledgeCsv(text)
}
