import * as fs from 'node:fs'
import { Readable } from 'node:stream'

import mammoth from 'mammoth'
import TurndownService from 'turndown'
import * as XLSX from 'xlsx'
import * as cpexcel from 'xlsx/dist/cpexcel.full.mjs'

import { normalize_knowledge_name } from '../../../shared/knowledge'
import { formatText } from '../format-text'
import {
  KnowledgeCsvError,
  normalize_sheet_value,
  type ParsedTable,
  parseKnowledgeCsv
} from './ingest-files'

XLSX.set_fs(fs)
XLSX.set_cptable(cpexcel)
XLSX.stream.set_readable(Readable)

const turndown = new TurndownService({ headingStyle: 'atx' })

export class KnowledgeSpreadsheetError extends Error {
  constructor(
    readonly code:
      | 'invalid_spreadsheet'
      | 'empty_workbook'
      | 'merged_cells'
      | 'missing_spreadsheet_header'
      | 'invalid_spreadsheet_header'
      | 'duplicate_spreadsheet_header',
    message: string
  ) {
    super(message)
    this.name = 'KnowledgeSpreadsheetError'
  }
}

export type ParsedSheet = ParsedTable & { index: number; name: string }

export type ParsedUpload =
  | { kind: 'document'; markdown: string }
  | { kind: 'table'; table: ParsedTable }
  | { kind: 'workbook'; sheets: ParsedSheet[] }

const blank = (value: unknown): boolean => value == null || String(value).trim() === ''

const parseSheet = (sheet: XLSX.WorkSheet, name: string, index: number): ParsedSheet | null => {
  if ((sheet['!merges'] ?? []).length > 0) {
    throw new KnowledgeSpreadsheetError(
      'merged_cells',
      `L’onglet « ${name} » contient des cellules fusionnées.`
    )
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
    raw: true
  })
  if (matrix.every((row) => row.every(blank))) return null
  const header = matrix[0] ?? []
  if (header.every(blank)) {
    throw new KnowledgeSpreadsheetError(
      'missing_spreadsheet_header',
      `L’onglet « ${name} » n’a pas d’en-têtes sur la première ligne.`
    )
  }
  const columns = header.map((cell) => normalize_knowledge_name(cell == null ? '' : String(cell)))
  if (columns.some((column) => !column)) {
    throw new KnowledgeSpreadsheetError(
      'invalid_spreadsheet_header',
      `Chaque colonne de l’onglet « ${name} » doit avoir un nom.`
    )
  }
  if (new Set(columns).size !== columns.length) {
    throw new KnowledgeSpreadsheetError(
      'duplicate_spreadsheet_header',
      `Les noms de colonnes de l’onglet « ${name} » doivent être uniques.`
    )
  }
  const rows = matrix.slice(1).flatMap((record) => {
    const cells = columns.map((_, cellIndex) => record[cellIndex] ?? null)
    if (cells.every(blank)) return []
    return [
      Object.fromEntries(
        columns.map((column, cellIndex) => [
          column,
          normalize_sheet_value(cells[cellIndex], column)
        ])
      )
    ]
  })
  return { index, name, columns, rows }
}

const parseWorkbook = (bytes: Uint8Array): ParsedUpload => {
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(bytes, { type: 'array', cellDates: true })
  } catch {
    throw new KnowledgeSpreadsheetError('invalid_spreadsheet', 'Le classeur ne peut pas être lu.')
  }
  const sheets = workbook.SheetNames.flatMap((name, index) => {
    const sheet = workbook.Sheets[name]
    if (!sheet) return []
    const parsed = parseSheet(sheet, name, index)
    return parsed ? [parsed] : []
  })
  if (sheets.length === 0) {
    throw new KnowledgeSpreadsheetError('empty_workbook', 'Le classeur ne contient aucun tableau.')
  }
  return { kind: 'workbook', sheets }
}

const markdownDocument = async (fileType: 'md' | 'docx', bytes: Uint8Array): Promise<string> => {
  if (fileType === 'md') {
    let text: string
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
      throw new KnowledgeCsvError('invalid_csv', 'Le fichier n’est pas encodé en UTF-8.')
    }
    return formatText('document.md', text)
  }
  const html = (await mammoth.convertToHtml({ buffer: Buffer.from(bytes) })).value.replace(
    /<img[^>]*\/?>/g,
    ''
  )
  return formatText('document.md', turndown.turndown(html))
}

export const parseKnowledgeUpload = async (
  fileType: 'csv' | 'md' | 'docx' | 'xlsx',
  bytes: Uint8Array
): Promise<ParsedUpload> => {
  if (fileType === 'csv') {
    let text: string
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
      throw new KnowledgeCsvError('invalid_csv', 'Le fichier n’est pas encodé en UTF-8.')
    }
    return { kind: 'table', table: parseKnowledgeCsv(text) }
  }
  if (fileType === 'md' || fileType === 'docx') {
    return { kind: 'document', markdown: await markdownDocument(fileType, bytes) }
  }
  return parseWorkbook(bytes)
}
