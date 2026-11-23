import { Database } from 'bun:sqlite'

import {
  type CoreDataContract,
  coreDataContractForFilename,
  resemblesCoreDataFilename
} from '../../../shared/core-data'
import { isKnowledgeSourceAssigned, type WorkbookSheetConfig } from '../../../shared/knowledge'
import { openDatastore } from '../datastore-db'
import type { KnowledgeSource, KnowledgeSourceDocumentInput } from './catalog-schema'
import { type ParsedTable } from './ingest-files'
import {
  assertKnowledgeCatalogValidInDb,
  findKnowledgeSourcesByFilename,
  insertKnowledgeSourceInDb,
  updateKnowledgeSourceFileInDb
} from './knowledge-sources'
import {
  KnowledgeUploadError,
  type ParsedSheet,
  parseKnowledgeUpload,
  parseWorkbook
} from './parse-upload'
import { listKnowledgeProfiles } from './profiles'
import { dropSourceTable, sourceTableName } from './source-tables'
import { import_rows } from './sqlite-table-import'

export class KnowledgeImportError extends Error {
  constructor(
    readonly status: 400 | 409,
    readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'KnowledgeImportError'
  }
}

export type ImportedKnowledgeSource = {
  source: KnowledgeSource
  changed: boolean
}

type FileType = Exclude<KnowledgeSource['fileType'], 'intake'>
type UploadOrigin = 'ui' | 'cli'

type PreparedSourceWrite =
  | { existing: KnowledgeSource; changed: false }
  | {
      existing: KnowledgeSource | null
      changed: true
      document: KnowledgeSourceDocumentInput
      markdown: string | null
      table: ParsedTable | null
    }

export const inferKnowledgeFileType = (name: string): FileType | null => {
  const lower = name.toLowerCase()
  if (lower.endsWith('.csv')) return 'csv'
  if (lower.endsWith('.md')) return 'md'
  if (lower.endsWith('.docx')) return 'docx'
  if (['.xlsx', '.xls', '.xlsm', '.xlsb'].some((extension) => lower.endsWith(extension))) {
    return 'xlsx'
  }
  return null
}

const hashBytes = (bytes: Uint8Array): string =>
  new Bun.CryptoHasher('sha256').update(bytes).digest('hex')

const stemWithoutExtension = (filename: string): string => filename.replace(/\.[^.]+$/, '')

const writeTable = (db: Database, sourceId: string, table: ParsedTable): void => {
  dropSourceTable(db, sourceId)
  void import_rows(db, sourceTableName(sourceId), table.rows, {
    columns: table.columns,
    transaction: false,
    refreshPostalReference: false
  })
}

const prepareSingleUpload = async (
  fileType: 'csv' | 'md' | 'docx',
  bytes: Uint8Array,
  originalName: string,
  origin: UploadOrigin,
  coreContract: CoreDataContract | null,
  existing: KnowledgeSource | null
): Promise<PreparedSourceWrite> => {
  const contentHash = hashBytes(bytes)
  if (existing && existing.contentHash === contentHash) {
    return { existing, changed: false }
  }
  try {
    const parsed = await parseKnowledgeUpload(fileType, bytes)
    return {
      existing,
      changed: true,
      document: {
        originalName,
        fileType,
        sizeBytes: bytes.byteLength,
        contentHash,
        origin,
        title: coreContract?.table ?? existing?.title ?? stemWithoutExtension(originalName),
        sheetName: null,
        headerRow: null,
        headerHash: null,
        profileIds: existing?.profileIds ?? [],
        moduleIds: existing?.moduleIds ?? []
      },
      markdown: parsed.kind === 'document' ? parsed.markdown : null,
      table: parsed.kind === 'table' ? parsed.table : null
    }
  } catch (error) {
    if (error instanceof KnowledgeUploadError) {
      throw new KnowledgeImportError(400, error.code, error.message)
    }
    throw error
  }
}

const prepareWorkbookSheetWrite = (
  meta: { originalName: string; sizeBytes: number; origin: UploadOrigin },
  sheet: ParsedSheet,
  existing: KnowledgeSource | null,
  sheetConfig: WorkbookSheetConfig | null
): PreparedSourceWrite => {
  const rewriteTable =
    !existing ||
    existing.contentHash !== sheet.contentHash ||
    existing.headerRow !== sheet.headerRow ||
    existing.headerHash !== sheet.headerHash
  const nextTitle = sheetConfig ? sheetConfig.title.trim() : (existing?.title ?? sheet.name)
  const metadataChanged =
    !existing ||
    existing.originalName !== meta.originalName ||
    existing.title !== nextTitle ||
    existing.sheetName !== sheet.name
  if (existing && !rewriteTable && !metadataChanged) {
    return { existing, changed: false }
  }
  return {
    existing,
    changed: true,
    document: {
      originalName: meta.originalName,
      fileType: 'xlsx',
      sizeBytes: meta.sizeBytes,
      contentHash: sheet.contentHash,
      origin: meta.origin,
      title: nextTitle,
      sheetName: sheet.name,
      headerRow: sheet.headerRow,
      headerHash: sheet.headerHash,
      profileIds: existing?.profileIds ?? [],
      moduleIds: existing?.moduleIds ?? []
    },
    markdown: null,
    table: rewriteTable ? { columns: sheet.columns, rows: sheet.rows } : null
  }
}

const prepareWorkbookUpload = (
  bytes: Uint8Array,
  originalName: string,
  origin: UploadOrigin,
  existingSources: readonly KnowledgeSource[],
  sheetConfig?: WorkbookSheetConfig
): PreparedSourceWrite[] => {
  const meta = { originalName, sizeBytes: bytes.byteLength, origin }
  const existingBySheet = new Map(
    existingSources
      .filter((source) => source.sheetName !== null)
      .map((source) => [source.sheetName!.toLocaleLowerCase('fr'), source])
  )

  try {
    if (sheetConfig) {
      const [parsedSheet] = parseWorkbook(bytes, {
        filename: originalName,
        specs: [{ sheetName: sheetConfig.sheetName, headerRow: sheetConfig.headerRow }]
      })
      return [
        prepareWorkbookSheetWrite(
          meta,
          parsedSheet!,
          existingBySheet.get(parsedSheet!.name.toLocaleLowerCase('fr')) ?? null,
          sheetConfig
        )
      ]
    }

    if (existingSources.length > 0) {
      const parsedSheets = parseWorkbook(bytes, {
        filename: originalName,
        specs: existingSources.map((source) => ({
          sheetName: source.sheetName!,
          headerRow: source.headerRow!,
          expectedHeaderHash: source.headerHash
        }))
      })
      return parsedSheets.map((sheet) =>
        prepareWorkbookSheetWrite(
          meta,
          sheet,
          existingBySheet.get(sheet.name.toLocaleLowerCase('fr'))!,
          null
        )
      )
    }

    const parsedSheets = parseWorkbook(bytes, { filename: originalName })
    return parsedSheets.map((sheet) => prepareWorkbookSheetWrite(meta, sheet, null, null))
  } catch (error) {
    if (error instanceof KnowledgeUploadError) {
      throw new KnowledgeImportError(400, error.code, error.message)
    }
    throw error
  }
}

const prepareUploads = async (
  files: File[],
  origin: UploadOrigin,
  sheetConfig?: WorkbookSheetConfig
): Promise<PreparedSourceWrite[]> => {
  if (sheetConfig && (files.length !== 1 || inferKnowledgeFileType(files[0]!.name) !== 'xlsx')) {
    throw new KnowledgeImportError(
      400,
      'invalid_config',
      'La configuration d’onglet ne s’applique qu’à un seul classeur Excel.'
    )
  }

  const writes: PreparedSourceWrite[] = []
  const seen = new Set<string>()
  for (const file of files) {
    const fileType = inferKnowledgeFileType(file.name)
    if (!fileType) {
      throw new KnowledgeImportError(
        400,
        'unsupported_file',
        `Format non pris en charge : ${file.name}`
      )
    }
    const originalName = file.name.normalize('NFC')
    const coreContract = coreDataContractForFilename(originalName)
    if (resemblesCoreDataFilename(originalName) && !coreContract) {
      throw new KnowledgeImportError(
        400,
        'invalid_core_filename',
        `Nom Core Data invalide : ${originalName}`
      )
    }
    const filenameKey = originalName.toLocaleLowerCase('fr')
    if (seen.has(filenameKey)) {
      throw new KnowledgeImportError(
        409,
        'filename_conflict',
        `${originalName} est envoyé plusieurs fois.`
      )
    }
    seen.add(filenameKey)

    const existingSources = findKnowledgeSourcesByFilename(originalName)
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (fileType !== 'xlsx') {
      writes.push(
        await prepareSingleUpload(
          fileType,
          bytes,
          originalName,
          origin,
          coreContract,
          existingSources[0] ?? null
        )
      )
      continue
    }

    writes.push(...prepareWorkbookUpload(bytes, originalName, origin, existingSources, sheetConfig))
  }
  return writes
}

const conflictMessage = (error: unknown): string | null => {
  if (!(error instanceof Error)) return null
  if (
    error.message.includes('Reserved Core Data title') ||
    error.message.includes('Knowledge title already used') ||
    error.message.includes('Knowledge source already exists') ||
    error.message.includes('Unknown knowledge profile') ||
    error.message.includes('Invalid Core Data source') ||
    error.message.includes('Invalid knowledge title')
  ) {
    return error.message
  }
  if (error.message.includes('UNIQUE')) return 'upload_conflict'
  return null
}

const isUnchangedWrite = (
  write: PreparedSourceWrite
): write is Extract<PreparedSourceWrite, { changed: false }> => !write.changed

const applyUploads = (
  writes: PreparedSourceWrite[],
  origin: UploadOrigin,
  validProfileIds: ReadonlySet<string>
): { sources: ImportedKnowledgeSource[]; shouldBuild: boolean } => {
  if (writes.every(isUnchangedWrite)) {
    return {
      sources: writes.map((write) => ({ source: write.existing, changed: false })),
      shouldBuild: false
    }
  }

  const db = openDatastore()
  try {
    return db
      .transaction(() => {
        const results: ImportedKnowledgeSource[] = []
        let shouldBuild = false

        for (const write of writes) {
          if (!write.changed) {
            results.push({ source: write.existing, changed: false })
            continue
          }
          if (write.existing) {
            const wasAssigned = isKnowledgeSourceAssigned(write.existing)
            const source = updateKnowledgeSourceFileInDb(
              db,
              write.existing.id,
              write.document,
              write.markdown
            )
            if (!source) throw new Error('Knowledge source disappeared during upload')
            if (write.table) writeTable(db, source.id, write.table)
            if (origin === 'cli' && (wasAssigned || isKnowledgeSourceAssigned(source))) {
              shouldBuild = true
            }
            results.push({ source, changed: true })
            continue
          }

          const source = insertKnowledgeSourceInDb(db, write.document, write.markdown)
          if (write.table) writeTable(db, source.id, write.table)
          if (origin === 'cli' && isKnowledgeSourceAssigned(source)) shouldBuild = true
          results.push({ source, changed: true })
        }

        assertKnowledgeCatalogValidInDb(db, validProfileIds)
        return { sources: results, shouldBuild }
      })
      .immediate()
  } catch (error) {
    if (error instanceof KnowledgeImportError) throw error
    const message = conflictMessage(error)
    if (message === 'upload_conflict') {
      throw new KnowledgeImportError(
        409,
        'upload_conflict',
        'Un fichier est déjà en cours d’import.'
      )
    }
    if (message) throw new KnowledgeImportError(409, 'source_conflict', message)
    throw error
  } finally {
    db.close()
  }
}

export const importKnowledgeFiles = async (
  files: File[],
  origin: UploadOrigin,
  sheetConfig?: WorkbookSheetConfig
): Promise<{ sources: ImportedKnowledgeSource[]; shouldBuild: boolean }> => {
  if (files.length === 0) {
    throw new KnowledgeImportError(400, 'missing_file', 'Aucun fichier fourni.')
  }
  const validProfileIds = new Set((await listKnowledgeProfiles()).map((profile) => profile.id))
  return applyUploads(await prepareUploads(files, origin, sheetConfig), origin, validProfileIds)
}
