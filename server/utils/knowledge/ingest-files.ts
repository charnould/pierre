import * as fs from 'node:fs'
import { cp, mkdir, readdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { Readable } from 'node:stream'

import { TZDate } from '@date-fns/tz'
import { format as formatDate } from 'date-fns'
import mammoth from 'mammoth'
import { format } from 'oxfmt'
import TurndownService from 'turndown'
import * as XLSX from 'xlsx'
import * as cpexcel from 'xlsx/dist/cpexcel.full.mjs'

import { normalize_knowledge_name } from '../../../shared/knowledge'
import { datastorePaths } from '../paths'
import type { KnowledgeIngestionEntry } from './catalog'
import {
  is_code_postal_column,
  is_keep_as_text_column,
  normalize_code_postal,
  stringify_identifier
} from './codes-postaux'
import { listKnowledgeProfiles, type KnowledgeProfile } from './profiles'

interface FormattedContent {
  data: string
  parser: 'md' | 'json'
}

const TIMEZONE = 'Europe/Paris'
const COMMUNITY_KNOWLEDGE_DIR = 'donnees_universelles'

// Initialise xlsx I/O adapters once at module level
XLSX.set_fs(fs)
XLSX.set_cptable(cpexcel)
XLSX.stream.set_readable(Readable)

const turndown_service = new TurndownService({ headingStyle: 'atx' })

/**
 * Recursively renames every file and directory inside `dir_path` using
 * `normalize_knowledge_name`, ensuring all paths are safe for downstream processing.
 *
 * @param dir_path - Root directory to traverse.
 */
const rename_files_recursively = async (dir_path: string): Promise<void> => {
  const files = await readdir(dir_path, { withFileTypes: true })

  for (const file of files) {
    const old_path = `${dir_path}/${file.name}`
    const new_name = normalize_knowledge_name(file.name, { preserve_extension: file.isFile() })
    const new_path = `${dir_path}/${new_name}`

    if (file.name !== new_name) await rename(old_path, new_path)
    if (file.isDirectory()) await rename_files_recursively(new_path)
  }
}

/**
 * Converts a `.docx` file to Markdown, stripping embedded images.
 *
 * @param filepath - Absolute or relative path to the `.docx` file.
 * @returns Formatted Markdown content.
 */
const process_docx_file = async (filepath: string): Promise<FormattedContent> => {
  const html = (await mammoth.convertToHtml({ path: filepath })).value
  // Remove images as image handling is not implemented
  const clean_html = html.replace(/<img[^>]*\/>/g, '')
  const markdown = turndown_service.turndown(clean_html)
  return { data: markdown, parser: 'md' }
}

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
  if (is_keep_as_text_column(key)) {
    return is_code_postal_column(key) ? normalize_code_postal(value) : stringify_identifier(value)
  }

  if (value instanceof Date) {
    return formatDate(new TZDate(value, TIMEZONE), 'yyyy-MM-dd')
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

/**
 * Expands merged cells in-place so each cell in a merged region carries the
 * top-left value, then clears the merge metadata.
 *
 * @param sheet - The XLSX worksheet to mutate.
 */
const unmerge_sheet_cells = (sheet: XLSX.WorkSheet): void => {
  for (const merge of sheet['!merges'] ?? []) {
    const merged_value = sheet[XLSX.utils.encode_cell(merge.s)]?.v ?? ''
    for (let row = merge.s.r; row <= merge.e.r; row++) {
      for (let col = merge.s.c; col <= merge.e.c; col++) {
        sheet[XLSX.utils.encode_cell({ r: row, c: col })] = { t: 's', v: merged_value }
      }
    }
  }
  sheet['!merges'] = []
}

/**
 * Parses a spreadsheet file into a JSON array of normalized row objects.
 *
 * @param filepath - Path to the `.xlsx` / `.xls` / `.xlsm` / `.xlsb` file.
 * @param sheet_index - Zero-based worksheet index to read.
 * @param header_row_index - Zero-based row index of the column header row.
 * @returns JSON-serialized normalized rows.
 */
/** Cache key for parsed source files shared across multiple access profiles. */
export const content_cache_key = (entry: KnowledgeIngestionEntry): string =>
  `${entry.filepath}:${entry.type}:${entry.sheet}:${entry.headers}`

const process_xlsx_file = async (
  filepath: string,
  sheet_index: number,
  header_row_index: number
): Promise<FormattedContent> => {
  const workbook = XLSX.read(await Bun.file(filepath).arrayBuffer(), { cellDates: true })
  const sheetName = workbook.SheetNames[sheet_index]
  if (!sheetName) throw new Error(`Spreadsheet sheet ${sheet_index + 1} does not exist`)
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) throw new Error(`Spreadsheet sheet ${sheetName} is unavailable`)

  unmerge_sheet_cells(sheet)

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    range: header_row_index,
    header: 1,
    defval: null,
    blankrows: false
  })
  const headerRow = matrix[0] ?? []
  const columns = headerRow.map((cell, index) => {
    const key = normalize_sheet_key(cell == null ? '' : String(cell))
    return key || `__empty${index + 1}`
  })
  const rows = matrix.slice(1).flatMap((record) => {
    const cells = columns.map((_, index) => record[index] ?? null)
    if (cells.every((cell) => cell === null || String(cell).trim() === '')) return []
    return [
      Object.fromEntries(
        columns.map((column, index) => [column, normalize_sheet_value(cells[index], column)])
      )
    ]
  })

  return { data: JSON.stringify({ columns, rows }), parser: 'json' }
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

export const loadKnowledgeCsv = async (
  path: string
): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> => {
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(await Bun.file(path).bytes())
  } catch {
    throw new KnowledgeCsvError('invalid_csv', 'Le fichier n’est pas encodé en UTF-8.')
  }
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

/**
 * Reads a Markdown file and returns its raw content.
 *
 * @param filepath - Path to the `.md` file.
 */
const process_markdown_file = async (filepath: string): Promise<FormattedContent> => ({
  data: await Bun.file(filepath).text(),
  parser: 'md'
})

const process_csv_file = async (filepath: string): Promise<FormattedContent> => ({
  data: JSON.stringify(await loadKnowledgeCsv(filepath)),
  parser: 'json'
})

/**
 * Dispatches file processing to the appropriate handler based on the source type.
 *
 * @param entry - Validated catalog entry describing the file to process.
 * @throws {Error} When the source type is not supported.
 */
const process_file = async (entry: KnowledgeIngestionEntry): Promise<FormattedContent> => {
  switch (entry.type) {
    case 'csv':
      return process_csv_file(entry.filepath)
    case 'docx':
      return process_docx_file(entry.filepath)
    case 'xlsx':
      return process_xlsx_file(entry.filepath, entry.sheet, entry.headers)
    case 'md':
      return process_markdown_file(entry.filepath)
    default:
      throw new Error(`Unsupported file type: ${entry.type}`)
  }
}

/**
 * Formats and writes processed file content to `output_path`.
 *
 * @param output_path - Destination path for the formatted output.
 * @param content - Processed content including data and parser type.
 */
export const save_formatted_file = async (
  output_path: string,
  content: FormattedContent
): Promise<void> => {
  if (content.parser === 'json') {
    await Bun.write(output_path, content.data)
    return
  }

  const { code } = await format(`a.${content.parser}`, content.data)
  await Bun.write(output_path, code)
}

/**
 * Creates a knowledge directory for each config and optionally copies community
 * knowledge data into it.
 */
export const setup_knowledge_directories = async (
  knowledgeRoot = datastorePaths().knowledge,
  profiles?: readonly KnowledgeProfile[]
): Promise<void> => {
  const configs = profiles ?? (await listKnowledgeProfiles())

  for (const config of configs) {
    const knowledge_path = join(knowledgeRoot, config.id)
    await rm(knowledge_path, { recursive: true, force: true })
    await mkdir(knowledge_path, { recursive: true })

    if (config.communityKnowledge) {
      const copied_path = `${knowledge_path}/${COMMUNITY_KNOWLEDGE_DIR}`
      await cp('./knowledge', copied_path, { recursive: true })
      await rename_files_recursively(copied_path)
    }
  }
}

/**
 * Ingests all assigned catalog entries into the knowledge store.
 *
 * The function performs three passes:
 * 1. **File anomalies** — detect catalog sources absent from disk.
 * 2. **Profile anomalies** — detect profile IDs no longer present in configuration.
 * 3. **Processing** — convert and write valid files to the knowledge directory.
 *
 * @param files - Validated and flattened catalog entries.
 * @returns An object containing any anomaly codes and subjects found during ingestion.
 */
export const ingest_files = async (
  files: KnowledgeIngestionEntry[],
  knowledgeRoot = datastorePaths().knowledge,
  profiles?: readonly KnowledgeProfile[]
): Promise<{ anomalies: { code: string; subject: string | null }[] }> => {
  const anomalies: { code: string; subject: string | null }[] = []

  const configs = profiles ?? (await listKnowledgeProfiles())

  const valid_config_ids = new Set(configs.map((c) => c.id))
  const assigned_profiles = new Set(files.map((file) => file.access).filter(Boolean) as string[])

  // Pass 1 — File anomalies (profile-agnostic, deduplicated by filepath)
  const checked_filepaths = new Set<string>()
  for (const entry of files) {
    if (checked_filepaths.has(entry.filepath)) continue
    checked_filepaths.add(entry.filepath)

    if (!(await Bun.file(entry.filepath).exists())) {
      console.warn(`⚠️ File not found on disk — ${entry.filepath}`)
      anomalies.push({ code: 'SOURCE_FILE_MISSING', subject: entry.filename })
    }
  }

  // Pass 2 — Profile anomalies (file-existence-agnostic)
  for (const profile of assigned_profiles) {
    if (!valid_config_ids.has(profile)) {
      anomalies.push({ code: 'PROFILE_MISSING', subject: profile })
    }
  }

  // Pass 3 — Process files with valid profile and existing on disk
  const core_data_by_config = new Map<string, Set<string>>()
  const parsed_by_source = new Map<string, FormattedContent>()

  for (const entry of files) {
    if (!entry.access || !valid_config_ids.has(entry.access)) continue
    if (!(await Bun.file(entry.filepath).exists())) continue

    const cache_key = content_cache_key(entry)
    let content = parsed_by_source.get(cache_key)
    if (!content) {
      const parse_start = performance.now()
      content = await process_file(entry)
      parsed_by_source.set(cache_key, content)
      const parse_seconds = ((performance.now() - parse_start) / 1000).toFixed(3)
      console.info(`📄 Parsed ${entry.filename} in ${parse_seconds}s`)
    }

    const normalized_name = normalize_knowledge_name(entry.agent_filename)
    const output_path = join(knowledgeRoot, entry.access, `${normalized_name}.${content.parser}`)

    const write_start = performance.now()
    await save_formatted_file(output_path, content)
    const write_seconds = ((performance.now() - write_start) / 1000).toFixed(3)
    console.info(
      `💾 Wrote ${normalized_name}.${content.parser} → ${entry.access} in ${write_seconds}s`
    )

    if (content.parser === 'json' && entry.coreDataTable) {
      if (!core_data_by_config.has(entry.access)) core_data_by_config.set(entry.access, new Set())
      core_data_by_config.get(entry.access)!.add(entry.coreDataTable)
    }
  }

  for (const [config, tables] of core_data_by_config) {
    await Bun.write(join(knowledgeRoot, config, '_core_data.json'), JSON.stringify([...tables]))
  }

  console.log('✅ Files processed')
  return { anomalies }
}
