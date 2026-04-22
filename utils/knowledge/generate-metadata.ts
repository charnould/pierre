import { format } from 'date-fns'
import * as XLSX from 'xlsx'
import { z } from 'zod'

const METADATA_FILE_PATH = '_metadata.xlsx'
const FILES_BASE_PATH = 'datastores'
const METADATA_SHEET_INDEX = 0
const METADATA_HEADER_ROW = 2

interface RawMetadataRow {
  filename: string
  agent_filename: string
  access: string
  sheet: number
  headers: number
  last_modified: null
}

interface MappedMetadataFile {
  filepath: string
  access: string[]
  sheet: number
  headers: number
  filename: string
  agent_filename: string
  last_modified: null
}

function getMetadataFilePath(): string {
  return `${FILES_BASE_PATH}/${Bun.env.SERVICE}/files/${METADATA_FILE_PATH}`
}

async function loadMetadataSheet(): Promise<XLSX.WorkSheet> {
  const filePath = getMetadataFilePath()
  const metadataFile = Bun.file(filePath)

  const exists = await metadataFile.exists()
  if (!exists) throw new Error(`❌ ${METADATA_FILE_PATH} is missing`)

  const workbook = XLSX.read(await metadataFile.arrayBuffer())
  return workbook.Sheets[workbook.SheetNames[METADATA_SHEET_INDEX]]
}

function parseRawRows(sheet: XLSX.WorkSheet): RawMetadataRow[] {
  return XLSX.utils.sheet_to_json<RawMetadataRow>(sheet, { range: METADATA_HEADER_ROW })
}

function mapToStandardFormat(rawFiles: RawMetadataRow[]): MappedMetadataFile[] {
  return rawFiles.map((item) => ({
    filepath: `${FILES_BASE_PATH}/${Bun.env.SERVICE}/files/${item.filename}`,
    access: item.access?.split(',').map((p) => p.trim().toLowerCase()) ?? [],
    headers: (item.headers || 1) - 1,
    sheet: (item.sheet || 1) - 1,
    filename: item.filename,
    agent_filename: item.agent_filename,
    last_modified: null
  }))
}

function explodeAndValidate(mappedFiles: MappedMetadataFile[]): z.infer<typeof Metadata>[] {
  return mappedFiles.flatMap((item) =>
    item.access.filter(Boolean).map((access) => Metadata.parse({ ...item, access }))
  )
}

export async function generate_metadata(): Promise<z.infer<typeof Metadata>[] | undefined> {
  try {
    const sheet = await loadMetadataSheet()
    const rawFiles = parseRawRows(sheet)
    const mappedFiles = mapToStandardFormat(rawFiles)
    const files = explodeAndValidate(mappedFiles)

    console.log('✅ Metadata generated')
    return files
  } catch (e) {
    console.log('❌ Metadata generation failed')
    console.error(e)
  }
}

function inferFileType(filepath: string): string {
  if (filepath.endsWith('.md')) return 'md'
  if (filepath.endsWith('.doc') || filepath.endsWith('.docx')) return 'docx'
  if (['.xls', '.xlsm', '.xlsb', '.xlsx'].some((ext) => filepath.endsWith(ext))) return 'xlsx'
  return null
}

export const Metadata = z
  .object({
    filename: z.string().trim(),
    agent_filename: z.string().trim(),
    filepath: z.string().trim(),
    type: z.enum(['doc', 'docx', 'xlsx', 'xls', 'xlsm', 'xlsb', 'md']).nullable().default(null),
    headers: z.number(),
    sheet: z.number(),
    access: z.string().toLowerCase().trim().nullable().default(null),
    last_modified: z.string().nullable().default(null)
  })
  .strict()
  .transform((m) => {
    m.type = (inferFileType(m.filepath) as any) ?? m.type
    if (m.last_modified === null) {
      m.last_modified = format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX")
    }
    return m
  })

export type Metadata = z.infer<typeof Metadata>
