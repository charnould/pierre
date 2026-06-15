import { format } from 'date-fns'
import * as XLSX from 'xlsx'
import { z } from 'zod'

import { normalize_knowledge_name } from './utils'

const METADATA_FILE_PATH = '_metadata.xlsx'
const FILES_BASE_PATH = 'datastores'
const METADATA_SHEET_INDEX = 0
const METADATA_HEADER_ROW = 2
const METADATA_FILE_TYPES = ['doc', 'docx', 'xlsx', 'xls', 'xlsm', 'xlsb', 'md'] as const

type MetadataFileType = (typeof METADATA_FILE_TYPES)[number]

interface RawMetadataRow {
  filename: string
  agent_filename: string
  access: string
  sheet: number
  headers: number
  last_modified: null
  url: string | null
}

interface MappedMetadataFile {
  filepath: string
  access: string[]
  sheet: number
  headers: number
  filename: string
  agent_filename: string
  last_modified: null
  url: string | null
}

/** Returns the absolute path to the `_metadata.xlsx` file for the current service. */
const get_metadata_file_path = (): string =>
  `${FILES_BASE_PATH}/${Bun.env['SERVICE']}/files/${METADATA_FILE_PATH}`

/**
 * Loads the first worksheet from `_metadata.xlsx`.
 *
 * @returns The worksheet, or `null` if the file does not exist.
 */
const load_metadata_sheet = async (): Promise<XLSX.WorkSheet | null> => {
  const file_path = get_metadata_file_path()
  const metadata_file = Bun.file(file_path)

  if (!(await metadata_file.exists())) return null

  const workbook = XLSX.read(await metadata_file.arrayBuffer())
  return workbook.Sheets[workbook.SheetNames[METADATA_SHEET_INDEX]]
}

/**
 * Parses raw data rows from the metadata worksheet.
 * Rows 0 and 1 are skipped (header area); row 2 holds column names.
 *
 * @param sheet - The XLSX worksheet to parse.
 * @returns An array of raw metadata row objects.
 */
const parse_raw_rows = (sheet: XLSX.WorkSheet): RawMetadataRow[] =>
  XLSX.utils.sheet_to_json<RawMetadataRow>(sheet, {
    range: METADATA_HEADER_ROW
  })

/**
 * Maps raw XLSX rows to a normalized intermediate format.
 *
 * @param raw_files - Raw rows from the metadata worksheet.
 * @returns Mapped metadata objects with resolved filepaths and split access lists.
 */
const map_to_standard_format = (raw_files: RawMetadataRow[]): MappedMetadataFile[] =>
  raw_files.map((item) => {
    const normalized_filename = normalize_knowledge_name(item.filename.normalize('NFC'), {
      preserve_extension: true
    })
    return {
      filepath: `${FILES_BASE_PATH}/${Bun.env['SERVICE']}/files/${normalized_filename}`,
      access: item.access?.split(',').map((p) => p.trim().toLowerCase()) ?? [],
      headers: (item.headers || 1) - 1,
      sheet: (item.sheet || 1) - 1,
      filename: item.filename,
      agent_filename: item.agent_filename,
      last_modified: null,
      url: item.url ?? null
    }
  })

/**
 * Explodes multi-access rows into one row per access value and validates each
 * against the `Metadata` Zod schema.
 *
 * @param mapped_files - Intermediate metadata objects with access arrays.
 * @returns Validated metadata entries and any validation error messages.
 */
const explode_and_validate = (
  mapped_files: MappedMetadataFile[]
): { files: z.infer<typeof Metadata>[]; errors: string[] } => {
  const files: z.infer<typeof Metadata>[] = []
  const errors: string[] = []

  for (const item of mapped_files) {
    for (const access of item.access.filter(Boolean)) {
      const result = Metadata.safeParse({ ...item, access })
      if (result.success) {
        files.push(result.data)
      } else {
        const msg = `${item.filename} (access: ${access}) — ${result.error.issues.map((i) => i.message).join(', ')}`
        errors.push(msg)
        console.warn(`⚠️ Format invalide dans _metadata — ${msg}`)
      }
    }
  }

  return { files, errors }
}

/**
 * Generates validated metadata from `_metadata.xlsx`.
 *
 * @returns An object with validated file metadata and any anomaly codes detected
 *   during parsing or validation (e.g. `METADATA_MISSING`, `METADATA_FORMAT_ERROR`).
 */
export const generate_metadata = async (): Promise<{
  files: z.infer<typeof Metadata>[]
  anomalies: { code: string; subject: string | null }[]
}> => {
  try {
    const sheet = await load_metadata_sheet()
    if (sheet === null) {
      console.warn(`⚠️ ${METADATA_FILE_PATH} not found — skipping file ingestion`)
      return {
        files: [],
        anomalies: [{ code: 'METADATA_MISSING', subject: null }]
      }
    }
    const raw_files = parse_raw_rows(sheet)
    const mapped_files = map_to_standard_format(raw_files)
    const { files, errors } = explode_and_validate(mapped_files)

    const anomalies = errors.map((e) => ({
      code: 'METADATA_FORMAT_ERROR',
      subject: e
    }))

    console.log('✅ Metadata generated')
    return { files, anomalies }
  } catch (error) {
    console.log('❌ Metadata generation failed')
    console.error(error)
    return {
      files: [],
      anomalies: [{ code: 'METADATA_FORMAT_ERROR', subject: String(error) }]
    }
  }
}

/**
 * Infers the file type from a filepath extension.
 *
 * @param filepath - The full path or filename to inspect.
 * @returns The file type (`'md'`, `'docx'`, `'xlsx'`…), or `null` if unknown.
 */
const infer_file_type = (filepath: string): MetadataFileType | null => {
  const lower_filepath = filepath.toLowerCase()

  if (lower_filepath.endsWith('.md')) return 'md'
  if (lower_filepath.endsWith('.doc') || lower_filepath.endsWith('.docx')) return 'docx'
  if (['.xls', '.xlsm', '.xlsb', '.xlsx'].some((ext) => lower_filepath.endsWith(ext))) {
    return 'xlsx'
  }
  return null
}

export const Metadata = z
  .object({
    filename: z.string().trim(),
    agent_filename: z.string().trim(),
    filepath: z.string().trim(),
    type: z.enum(METADATA_FILE_TYPES).nullable().default(null),
    headers: z.number(),
    sheet: z.number(),
    access: z.string().toLowerCase().trim().nullable().default(null),
    last_modified: z.string().nullable().default(null),
    url: z.url().trim().nullable().default(null)
  })
  .strict()
  .transform((m) => ({
    ...m,
    type: infer_file_type(m.filepath) ?? m.type,
    last_modified: m.last_modified ?? format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX")
  }))

export type Metadata = z.infer<typeof Metadata>
