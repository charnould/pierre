import * as fs from 'node:fs'
import { Readable } from 'node:stream'

import mammoth from 'mammoth'
import TurndownService from 'turndown'
import * as XLSX from 'xlsx'
import * as cpexcel from 'xlsx/dist/cpexcel.full.mjs'

import {
  validateSpreadsheetHeaders,
  type WorkbookColumnStats,
  type WorkbookInspectCell,
  type WorkbookInspectRow,
  type WorkbookInspectSheet
} from '../../../shared/knowledge'
import { zonedDateParts } from '../../../shared/zoned-date'
import { formatMarkdown } from '../format-markdown'
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
const DEFAULT_INSPECT_MAX_ROWS = 60

export class KnowledgeUploadError extends Error {
  constructor(
    readonly code:
      | 'invalid_file'
      | 'invalid_spreadsheet'
      | 'empty_workbook'
      | 'missing_configured_sheet'
      | 'spreadsheet_structure_changed'
      | 'missing_spreadsheet_header'
      | 'invalid_spreadsheet_header'
      | 'duplicate_spreadsheet_header',
    message: string
  ) {
    super(message)
    this.name = 'KnowledgeUploadError'
  }
}

export type ParsedSheet = ParsedTable & {
  name: string
  headerRow: number
  headerHash: string
  contentHash: string
}

export type WorkbookParseSpec = {
  sheetName: string
  headerRow: number
  expectedHeaderHash?: string | null
}

export type ParsedUpload =
  { kind: 'document'; markdown: string } | { kind: 'table'; table: ParsedTable }

type GridEntry = { value: unknown; own: boolean }

type UnmergedSheet = {
  name: string
  totalRows: number
  excelCols: number[]
  columnStats: WorkbookColumnStats[]
  rows: Map<number, Map<number, GridEntry>>
  contentHash: string
}

const blank = (value: unknown): boolean => value == null || String(value).trim() === ''

const sha256Text = (value: string): string =>
  new Bun.CryptoHasher('sha256').update(value).digest('hex')

const formatPreviewValue = (value: unknown): string | null => {
  if (blank(value)) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const { year, month, day } = zonedDateParts(value, 'Europe/Paris')
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  return String(value)
}

const serializeHashValue = (value: unknown): string | number | boolean => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString()
  if (typeof value === 'number' || typeof value === 'boolean') return value
  return String(value)
}

const readWorkbook = (bytes: Uint8Array, filename?: string): XLSX.WorkBook => {
  try {
    return XLSX.read(bytes, { type: 'array', cellDates: true })
  } catch {
    const prefix = filename ? `${filename} : ` : ''
    throw new KnowledgeUploadError(
      'invalid_spreadsheet',
      `${prefix}Le classeur ne peut pas être lu.`
    )
  }
}

const setCell = (
  rows: Map<number, Map<number, GridEntry>>,
  rowNumber: number,
  col: number,
  entry: GridEntry
): void => {
  let row = rows.get(rowNumber)
  if (!row) {
    row = new Map()
    rows.set(rowNumber, row)
  }
  row.set(col, entry)
}

const unmergeSheet = (sheet: XLSX.WorkSheet, name: string): UnmergedSheet => {
  const rows = new Map<number, Map<number, GridEntry>>()
  for (const key of Object.keys(sheet)) {
    if (key.startsWith('!')) continue
    const cell = sheet[key] as XLSX.CellObject | undefined
    if (!cell || blank(cell.v)) continue
    const { r, c } = XLSX.utils.decode_cell(key)
    setCell(rows, r + 1, c, { value: cell.v, own: true })
  }

  for (const merge of sheet['!merges'] ?? []) {
    const origin = rows.get(merge.s.r + 1)?.get(merge.s.c)?.value
    if (origin === undefined) continue
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        setCell(rows, r + 1, c, { value: origin, own: c === merge.s.c })
      }
    }
  }

  if (rows.size === 0) {
    return {
      name,
      totalRows: 0,
      excelCols: [],
      columnStats: [],
      rows,
      contentHash: sha256Text('[]')
    }
  }

  let totalRows = 0
  const statsByExcelCol = new Map<number, { lastNonEmptyRow: number; lastOwnRow: number }>()
  const hashEntries: Array<[number, number, string | number | boolean]> = []

  for (const [rowNumber, row] of rows) {
    if (rowNumber > totalRows) totalRows = rowNumber
    for (const [col, entry] of row) {
      const current = statsByExcelCol.get(col)
      if (!current) {
        statsByExcelCol.set(col, {
          lastNonEmptyRow: rowNumber,
          lastOwnRow: entry.own ? rowNumber : 0
        })
      } else {
        if (rowNumber > current.lastNonEmptyRow) current.lastNonEmptyRow = rowNumber
        if (entry.own && rowNumber > current.lastOwnRow) current.lastOwnRow = rowNumber
      }
      hashEntries.push([rowNumber, col, serializeHashValue(entry.value)])
    }
  }

  hashEntries.sort((left, right) => left[0] - right[0] || left[1] - right[1])
  const excelCols = [...statsByExcelCol.keys()].sort((a, b) => a - b)
  const columnStats: WorkbookColumnStats[] = excelCols.map((excelCol, colIndex) => {
    const stat = statsByExcelCol.get(excelCol)!
    return {
      colIndex,
      colLetter: XLSX.utils.encode_col(excelCol),
      lastNonEmptyRow: stat.lastNonEmptyRow,
      lastOwnRow: stat.lastOwnRow
    }
  })

  return {
    name,
    totalRows,
    excelCols,
    columnStats,
    rows,
    contentHash: sha256Text(JSON.stringify(hashEntries))
  }
}

const rowCellsFor = (unmerged: UnmergedSheet, rowNumber: number): WorkbookInspectCell[] => {
  const row = unmerged.rows.get(rowNumber)
  return unmerged.excelCols.map((excelCol) => {
    const entry = row?.get(excelCol)
    return entry
      ? { value: formatPreviewValue(entry.value), own: entry.own }
      : { value: null, own: false }
  })
}

export const inspectWorkbook = (
  bytes: Uint8Array,
  options: { maxRows?: number; filename?: string } = {}
): WorkbookInspectSheet[] => {
  const workbook = readWorkbook(bytes, options.filename)
  const maxRows = Math.max(1, Math.min(options.maxRows ?? DEFAULT_INSPECT_MAX_ROWS, 500))
  const sheets: WorkbookInspectSheet[] = []

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    if (!sheet) continue
    const unmerged = unmergeSheet(sheet, name)
    if (unmerged.totalRows === 0) continue
    const limit = Math.min(unmerged.totalRows, maxRows)
    const rows: WorkbookInspectRow[] = []
    for (let rowNumber = 1; rowNumber <= limit; rowNumber++) {
      rows.push({ rowNumber, cells: rowCellsFor(unmerged, rowNumber) })
    }
    sheets.push({
      name: unmerged.name,
      totalRows: unmerged.totalRows,
      rows,
      columnStats: unmerged.columnStats
    })
  }

  if (sheets.length === 0) {
    const prefix = options.filename ? `${options.filename} : ` : ''
    throw new KnowledgeUploadError(
      'empty_workbook',
      `${prefix}Le classeur ne contient aucun tableau.`
    )
  }
  return sheets
}

const parseUnmergedSheet = (
  unmerged: UnmergedSheet,
  spec: { headerRow: number; expectedHeaderHash?: string | null },
  filename?: string
): ParsedSheet => {
  const prefix = filename ? `${filename} · ` : ''
  const headerCells = rowCellsFor(unmerged, spec.headerRow)
  const validation = validateSpreadsheetHeaders(headerCells, unmerged.columnStats, spec.headerRow)
  if (!validation.ok) {
    throw new KnowledgeUploadError(
      validation.code,
      `${prefix}Onglet « ${unmerged.name} » (ligne ${spec.headerRow}) : ${validation.message}`
    )
  }

  const headerHash = sha256Text(
    JSON.stringify(validation.columns.map((column) => [column.colLetter, column.name]))
  )
  if (spec.expectedHeaderHash && spec.expectedHeaderHash !== headerHash) {
    throw new KnowledgeUploadError(
      'spreadsheet_structure_changed',
      `${prefix}Les en-têtes de l’onglet « ${unmerged.name} » ont changé (ligne ${spec.headerRow}).`
    )
  }

  const dataRowNumbers = [...unmerged.rows.keys()]
    .filter((rowNumber) => rowNumber > spec.headerRow)
    .sort((a, b) => a - b)

  const rows: Array<Record<string, unknown>> = []
  for (const rowNumber of dataRowNumbers) {
    const row = unmerged.rows.get(rowNumber)!
    const values = validation.columns.map(
      (column) => row.get(unmerged.excelCols[column.colIndex]!)?.value ?? null
    )
    if (values.every(blank)) continue
    rows.push(
      Object.fromEntries(
        validation.columns.map((column, index) => [
          column.name,
          normalize_sheet_value(values[index], column.name)
        ])
      )
    )
  }

  return {
    name: unmerged.name,
    headerRow: spec.headerRow,
    headerHash,
    contentHash: unmerged.contentHash,
    columns: validation.columns.map((column) => column.name),
    rows
  }
}

export const parseWorkbook = (
  bytes: Uint8Array,
  options: { specs?: readonly WorkbookParseSpec[]; filename?: string } = {}
): ParsedSheet[] => {
  const workbook = readWorkbook(bytes, options.filename)
  const prefix = options.filename ? `${options.filename} · ` : ''

  if (options.specs) {
    if (options.specs.length === 0) {
      throw new KnowledgeUploadError(
        'empty_workbook',
        `${prefix}Aucun onglet sélectionné dans le classeur.`
      )
    }
    const byLowerName = new Map(
      workbook.SheetNames.map((name) => [name.toLocaleLowerCase('fr'), name])
    )
    return options.specs.map((spec) => {
      const actualName = byLowerName.get(spec.sheetName.toLocaleLowerCase('fr'))
      const sheet = actualName ? workbook.Sheets[actualName] : undefined
      if (!actualName || !sheet) {
        throw new KnowledgeUploadError(
          'missing_configured_sheet',
          `${prefix}L’onglet « ${spec.sheetName} » est introuvable.`
        )
      }
      return parseUnmergedSheet(unmergeSheet(sheet, actualName), spec, options.filename)
    })
  }

  const sheets: ParsedSheet[] = []
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    if (!sheet) continue
    const unmerged = unmergeSheet(sheet, name)
    if (unmerged.totalRows === 0) continue
    sheets.push(parseUnmergedSheet(unmerged, { headerRow: 1 }, options.filename))
  }
  if (sheets.length === 0) {
    throw new KnowledgeUploadError(
      'empty_workbook',
      `${prefix}Le classeur ne contient aucun tableau.`
    )
  }
  return sheets
}

const markdownDocument = async (fileType: 'md' | 'docx', bytes: Uint8Array): Promise<string> => {
  if (fileType === 'md') {
    let text: string
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
      throw new KnowledgeUploadError('invalid_file', 'Le fichier n’est pas encodé en UTF-8.')
    }
    return formatMarkdown(text)
  }
  let html: string
  try {
    html = (await mammoth.convertToHtml({ buffer: Buffer.from(bytes) })).value.replace(
      /<img[^>]*\/?>/g,
      ''
    )
  } catch {
    throw new KnowledgeUploadError('invalid_file', 'Le document Word ne peut pas être lu.')
  }
  return formatMarkdown(turndown.turndown(html))
}

export const parseKnowledgeUpload = async (
  fileType: 'csv' | 'md' | 'docx',
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
  return { kind: 'document', markdown: await markdownDocument(fileType, bytes) }
}
