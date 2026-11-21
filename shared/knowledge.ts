import type { DatastoreTable } from './core-data'
import type { BusinessModuleId } from './modules'

export type KnowledgeSource = {
  id: string
  originalName: string
  fileType: 'csv' | 'md' | 'docx' | 'xlsx'
  sizeBytes: number
  contentHash: string | null
  origin: 'ui' | 'cli'
  title: string
  sheetName: string | null
  headerRow: number | null
  headerHash: string | null
  profileIds: string[]
  moduleIds: BusinessModuleId[]
  coreDataTable: DatastoreTable | null
  createdAt: string
  updatedAt: string
}

export type WorkbookSheetConfig = {
  sheetName: string
  headerRow: number
  title: string
}

export type WorkbookInspectCell = {
  value: string | null
  own: boolean
}

export type WorkbookInspectRow = {
  rowNumber: number
  cells: WorkbookInspectCell[]
}

export type WorkbookColumnStats = {
  colIndex: number
  colLetter: string
  lastNonEmptyRow: number
  lastOwnRow: number
}

export type WorkbookInspectSheet = {
  name: string
  totalRows: number
  rows: WorkbookInspectRow[]
  columnStats: WorkbookColumnStats[]
}

export type ValidatedSpreadsheetColumn = {
  colIndex: number
  colLetter: string
  name: string
}

export type SpreadsheetValidationErrorCode =
  'missing_spreadsheet_header' | 'invalid_spreadsheet_header' | 'duplicate_spreadsheet_header'

export type SpreadsheetValidationResult =
  | { ok: true; columns: ValidatedSpreadsheetColumn[] }
  | {
      ok: false
      code: SpreadsheetValidationErrorCode
      message: string
    }

type KnowledgeDiagnostic = {
  level: 'info' | 'warning' | 'error'
  code: string
  message: string
  subject: string | null
}

export type KnowledgeBuild = {
  id: string
  status: 'queued' | 'running' | 'succeeded' | 'failed'
  trigger: 'startup' | 'cron' | 'upload' | 'patch' | 'delete' | 'manual' | 'chatbot'
  requestedBy: string | null
  catalogFingerprint: string | null
  startedAt: string | null
  finishedAt: string | null
  coreFingerprint: string | null
  ownerId: string
  heartbeatAt: string
  items: Array<{ key: string; status: 'succeeded' | 'failed' }>
  diagnostics: KnowledgeDiagnostic[]
  createdAt: string
  updatedAt: string
}

export type KnowledgeProfile = {
  id: string
  label: string
  kind: 'chatbot' | 'skill'
  communityKnowledge: boolean
}

export type KnowledgeData = {
  sources: KnowledgeSource[]
  profiles: KnowledgeProfile[]
  coreDataTables: Array<{ table: DatastoreTable; filename: string; label: string }>
  lastBuild: KnowledgeBuild | null
  needsRebuild: boolean
}

type KnowledgeApiError = {
  error: {
    code: string
    message: string
  }
}

export type KnowledgeResponse = { data: KnowledgeData } | KnowledgeApiError
export type KnowledgeBuildsResponse = { data: { builds: KnowledgeBuild[] } } | KnowledgeApiError
export type KnowledgeBuildResponse = { data: { build: KnowledgeBuild } } | KnowledgeApiError
export type KnowledgeSourceResponse = { data: { source: KnowledgeSource } } | KnowledgeApiError
export type KnowledgeUploadResponse =
  | {
      data: {
        sources: Array<{
          source: KnowledgeSource
          changed: boolean
        }>
      }
    }
  | KnowledgeApiError
export type WorkbookInspectResponse =
  | {
      data: {
        originalName: string
        sheets: WorkbookInspectSheet[]
      }
    }
  | KnowledgeApiError

export const isKnowledgeSourceAssigned = (
  source: Pick<KnowledgeSource, 'profileIds' | 'moduleIds'>
): boolean => source.profileIds.length > 0 || source.moduleIds.length > 0

/**
 * Normalizes knowledge labels, table names, and column names to
 * lowercase ASCII `snake_case` (`Nom complet` → `nom_complet`).
 */
export const normalize_knowledge_name = (value: string): string =>
  value
    .normalize('NFC')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')

const formatListFr = (items: readonly string[]): string =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} et ${items.at(-1)}`

/**
 * Validates spreadsheet header cells against full-sheet column stats.
 * Data always starts on `headerRow + 1` (blank rows are ignored by the parser).
 * Shared between the live workbook import dialog and the server parser.
 */
export const validateSpreadsheetHeaders = (
  headerCells: readonly WorkbookInspectCell[],
  columnStats: readonly WorkbookColumnStats[],
  headerRow: number
): SpreadsheetValidationResult => {
  const dataStartRow = headerRow + 1
  const columns: ValidatedSpreadsheetColumn[] = []
  const untitledColumns: string[] = []

  for (const col of columnStats) {
    const cell = headerCells[col.colIndex]
    const raw = cell?.value == null ? '' : cell.value.trim()
    const hasHeader = raw !== ''
    const hasData = col.lastNonEmptyRow >= dataStartRow

    if (!hasHeader && !hasData) continue
    if (!cell?.own && col.lastOwnRow < dataStartRow) continue
    if (!hasHeader) {
      untitledColumns.push(col.colLetter)
      continue
    }
    const name = normalize_knowledge_name(raw)
    if (!name) {
      untitledColumns.push(col.colLetter)
      continue
    }
    columns.push({ colIndex: col.colIndex, colLetter: col.colLetter, name })
  }

  if (columns.length === 0 && untitledColumns.length === 0) {
    return {
      ok: false,
      code: 'missing_spreadsheet_header',
      message: 'Aucun en-tête trouvé sur cette ligne.'
    }
  }

  if (untitledColumns.length > 0) {
    const message =
      untitledColumns.length === 1
        ? `Colonne sans titre : ${untitledColumns[0]}.`
        : `Colonnes sans titre : ${untitledColumns.join(', ')}.`
    return {
      ok: false,
      code: 'invalid_spreadsheet_header',
      message
    }
  }

  const byName = new Map<string, string[]>()
  for (const column of columns) {
    const letters = byName.get(column.name)
    if (letters) letters.push(column.colLetter)
    else byName.set(column.name, [column.colLetter])
  }
  const duplicateColumns = [...byName.entries()]
    .filter(([, letters]) => letters.length > 1)
    .map(([name, letters]) => ({ name, columns: letters }))

  if (duplicateColumns.length > 0) {
    const details = duplicateColumns
      .map(({ name, columns: letters }) => `${formatListFr(letters)} (« ${name} »)`)
      .join(' ; ')
    return {
      ok: false,
      code: 'duplicate_spreadsheet_header',
      message: `Colonnes en doublon : ${details}.`
    }
  }

  return { ok: true, columns }
}
