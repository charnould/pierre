import * as fs from 'node:fs'
import { existsSync } from 'node:fs'
import { cp, mkdir, readdir, rename, rm } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { Readable } from 'node:stream'

import { TZDate } from '@date-fns/tz'
import { format as formatDate } from 'date-fns'
import mammoth from 'mammoth'
import { format } from 'oxfmt'
import TurndownService from 'turndown'
import * as XLSX from 'xlsx'
import * as cpexcel from 'xlsx/dist/cpexcel.full.mjs'

import { Config } from '../_schema'
import { CUSTOMIZATION_DIR } from '../paths'
import type { Metadata } from './generate-metadata'
import { normalize_knowledge_name } from './utils'

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
 * Loads all chatbot and skill configurations from the `customization/` directory.
 *
 * @returns An array of `Config` objects for all chatbots and skills found.
 */
const load_configs = async (): Promise<Config[]> => {
  const configs: Config[] = []

  const chatbot_dirs = await readdir(join(CUSTOMIZATION_DIR, 'chatbot'))
  for (const dir of chatbot_dirs) {
    const content = (await import(`../../../customization/chatbot/${dir}/config`)).default as Config
    configs.push(content)
  }

  const skillsDir = join(CUSTOMIZATION_DIR, 'skills')
  if (existsSync(skillsDir)) {
    const skill_entries = await readdir(skillsDir, { withFileTypes: true })
    for (const entry of skill_entries.filter((e) => e.isDirectory())) {
      try {
        const content = (await import(`../../../customization/skills/${entry.name}/config`))
          .default as Config
        configs.push(content)
      } catch (error) {
        console.warn(`⚠️ Skipping invalid skill config — ${entry.name}`, error)
      }
    }
  }

  return configs
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
const normalize_sheet_key = (key: string): string => key.toLowerCase().trim()

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
 */
export const normalize_sheet_value = (value: unknown): unknown => {
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
export const content_cache_key = (metadata: Metadata): string =>
  `${metadata.filepath}:${metadata.type}:${metadata.sheet}:${metadata.headers}`

const process_xlsx_file = async (
  filepath: string,
  sheet_index: number,
  header_row_index: number
): Promise<FormattedContent> => {
  const workbook = XLSX.read(await Bun.file(filepath).arrayBuffer(), { cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[sheet_index]]

  unmerge_sheet_cells(sheet)

  const rows = XLSX.utils.sheet_to_json(sheet, { range: header_row_index, defval: null })

  const normalized_rows = rows.map((obj) =>
    Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        normalize_sheet_key(key),
        normalize_sheet_value(value)
      ])
    )
  )

  return { data: JSON.stringify(normalized_rows), parser: 'json' }
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

/**
 * Dispatches file processing to the appropriate handler based on `metadata.type`.
 *
 * @param metadata - Validated metadata entry describing the file to process.
 * @throws {Error} When `metadata.type` is not one of the supported types.
 */
const process_file = async (metadata: Metadata): Promise<FormattedContent> => {
  switch (metadata.type) {
    case 'docx':
      return process_docx_file(metadata.filepath)
    case 'xlsx':
      return process_xlsx_file(metadata.filepath, metadata.sheet, metadata.headers)
    case 'md':
      return process_markdown_file(metadata.filepath)
    default:
      throw new Error(`Unsupported file type: ${metadata.type}`)
  }
}

/**
 * Formats and writes processed file content to `output_path`.
 * For Markdown files, prepends a YAML frontmatter block with `url` when provided.
 *
 * @param output_path - Destination path for the formatted output.
 * @param content - Processed content including data and parser type.
 * @param url - Optional source URL to embed as frontmatter in Markdown files.
 */
export const save_formatted_file = async (
  output_path: string,
  content: FormattedContent,
  url?: string | null
): Promise<void> => {
  if (content.parser === 'json') {
    await Bun.write(output_path, content.data)
    return
  }

  const { code } = await format(`a.${content.parser}`, content.data)
  const final = url && content.parser === 'md' ? `---\nurl: ${url}\n---\n\n${code}` : code
  await Bun.write(output_path, final)
}

/**
 * Creates a knowledge directory for each config and optionally copies community
 * knowledge data into it.
 */
export const setup_knowledge_directories = async (): Promise<void> => {
  const configs = await load_configs()

  for (const config of configs) {
    const knowledge_path = `datastores/${Bun.env['SERVICE']}/knowledge/${config.id}`
    await rm(knowledge_path, { recursive: true, force: true })
    await mkdir(knowledge_path, { recursive: true })

    if (config.community_knowledge) {
      const copied_path = `${knowledge_path}/${COMMUNITY_KNOWLEDGE_DIR}`
      await cp('./knowledge', copied_path, { recursive: true })
      await rename_files_recursively(copied_path)
    }
  }
}

/**
 * Ingests all validated files described by `files` metadata into the knowledge store.
 *
 * The function performs three passes:
 * 1. **File anomalies** — detect files referenced in metadata but absent from disk.
 * 2. **Profile anomalies** — detect mismatches between metadata profiles and config IDs.
 * 3. **Processing** — convert and write valid files to the knowledge directory.
 *
 * @param files - Validated metadata entries returned by `generate_metadata`.
 * @returns An object containing any anomaly codes and subjects found during ingestion.
 */
export const ingest_files = async (
  files: Metadata[]
): Promise<{ anomalies: { code: string; subject: string | null }[] }> => {
  const anomalies: { code: string; subject: string | null }[] = []

  const configs = await load_configs()

  const valid_config_ids = new Set(configs.map((c) => c.id))
  const metadata_filenames = new Set(files.map((f) => basename(f.filepath)))
  const metadata_profiles = new Set(files.map((f) => f.access).filter(Boolean) as string[])

  // Pass 1 — File anomalies (profile-agnostic, deduplicated by filepath)
  const checked_filepaths = new Set<string>()
  for (const metadata of files) {
    if (checked_filepaths.has(metadata.filepath)) continue
    checked_filepaths.add(metadata.filepath)

    if (!(await Bun.file(metadata.filepath).exists())) {
      console.warn(`⚠️ File not found on disk — ${metadata.filepath}`)
      anomalies.push({ code: 'METADATA_NOT_IN_FILES', subject: metadata.filename })
    }
  }

  const disk_files = await readdir(`datastores/${Bun.env['SERVICE']}/files`)
  for (const f of disk_files) {
    if (f !== '_metadata.xlsx' && !metadata_filenames.has(f)) {
      anomalies.push({ code: 'FILE_NOT_IN_METADATA', subject: f })
    }
  }

  // Pass 2 — Profile anomalies (file-existence-agnostic)
  for (const profile of metadata_profiles) {
    if (!valid_config_ids.has(profile)) {
      anomalies.push({ code: 'PROFILE_MISSING_IN_ASSETS', subject: profile })
    }
  }

  for (const config of configs) {
    if (!metadata_profiles.has(config.id)) {
      anomalies.push({ code: 'PROFILE_NOT_IN_METADATA', subject: config.id })
    }
  }

  // Pass 3 — Process files with valid profile and existing on disk
  const sources_by_config = new Map<string, Record<string, string | null>>()
  const parsed_by_source = new Map<string, FormattedContent>()

  for (const metadata of files) {
    if (!metadata.access || !valid_config_ids.has(metadata.access)) continue
    if (!(await Bun.file(metadata.filepath).exists())) continue

    const cache_key = content_cache_key(metadata)
    let content = parsed_by_source.get(cache_key)
    if (!content) {
      const parse_start = performance.now()
      content = await process_file(metadata)
      parsed_by_source.set(cache_key, content)
      const parse_seconds = ((performance.now() - parse_start) / 1000).toFixed(3)
      console.info(`📄 Parsed ${metadata.filename} in ${parse_seconds}s`)
    }

    const normalized_name = normalize_knowledge_name(metadata.agent_filename)
    const output_path = `./datastores/${Bun.env['SERVICE']}/knowledge/${metadata.access}/${normalized_name}.${content.parser}`

    const write_start = performance.now()
    await save_formatted_file(output_path, content, metadata.url)
    const write_seconds = ((performance.now() - write_start) / 1000).toFixed(3)
    console.info(
      `💾 Wrote ${normalized_name}.${content.parser} → ${metadata.access} in ${write_seconds}s`
    )

    // Track all JSON files (with or without URL) for the _sources table
    if (content.parser === 'json') {
      if (!sources_by_config.has(metadata.access)) sources_by_config.set(metadata.access, {})
      sources_by_config.get(metadata.access)![normalized_name] = metadata.url ?? null
    }
  }

  // Write _sources.json for each config that has at least one JSON file
  for (const [config, sources] of sources_by_config) {
    const sources_path = `./datastores/${Bun.env['SERVICE']}/knowledge/${config}/_sources.json`
    await Bun.write(sources_path, JSON.stringify(sources))
  }

  console.log('✅ Files processed')
  return { anomalies }
}
