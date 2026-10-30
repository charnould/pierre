import { Database } from 'bun:sqlite'

import {
  type CoreDataContract,
  coreDataContractForFilename,
  resemblesCoreDataFilename
} from '../../../shared/core-data'
import { isKnowledgeEntryAssigned, normalize_knowledge_name } from '../../../shared/knowledge'
import { openDatastore } from '../datastore-db'
import type { KnowledgeEntry, KnowledgeSource } from './catalog-schema'
import { KnowledgeCsvError, type ParsedTable } from './ingest-files'
import {
  findKnowledgeSourceByStorageName,
  insertKnowledgeSourceInDb,
  updateKnowledgeSourceFileInDb
} from './knowledge-sources'
import { KnowledgeSpreadsheetError, type ParsedSheet, parseKnowledgeUpload } from './parse-upload'
import { listKnowledgeProfiles } from './profiles'
import { dropSourceTables, sourceTableName } from './source-tables'
import { type DataRow, import_rows } from './sqlite-table-import'

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

type FileType = KnowledgeSource['fileType']

type PreparedUpload = {
  fileType: FileType
  originalName: string
  storageName: string
  source: KnowledgeSource | null
  contentHash: string
  sizeBytes: number
  changed: boolean
  coreContract: CoreDataContract | null
  markdown: string | null
  table: ParsedTable | null
  sheets: ParsedSheet[]
}

const inferFileType = (name: string): FileType | null => {
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

const isAssigned = (source: KnowledgeSource): boolean =>
  source.entries.some((entry) => isKnowledgeEntryAssigned(entry))

const entriesForUpload = (
  fileType: FileType,
  originalName: string,
  sheets: ParsedSheet[],
  previous: readonly KnowledgeEntry[] = [],
  coreContract: CoreDataContract | null = null
): KnowledgeEntry[] => {
  if (fileType !== 'xlsx') {
    const existing = previous[0]
    return [
      existing
        ? {
            ...existing,
            title: coreContract?.table ?? existing.title,
            sheet: null,
            sheetName: null
          }
        : {
            title: coreContract?.table ?? stemWithoutExtension(originalName),
            sheet: null,
            sheetName: null,
            profileIds: [],
            moduleIds: []
          }
    ]
  }
  const previousByName = new Map(
    previous
      .filter((entry) => entry.sheetName !== null)
      .map((entry) => [entry.sheetName!.toLocaleLowerCase('fr'), entry])
  )
  return sheets.map((sheet) => {
    const existing = previousByName.get(sheet.name.toLocaleLowerCase('fr'))
    return existing
      ? { ...existing, sheet: sheet.index, sheetName: sheet.name }
      : {
          title: sheet.name,
          sheet: sheet.index,
          sheetName: sheet.name,
          profileIds: [],
          moduleIds: []
        }
  })
}

const writeTables = (db: Database, sourceId: string, item: PreparedUpload): void => {
  const tables =
    item.fileType === 'csv' && item.table
      ? [{ sheet: 0, columns: item.table.columns, rows: item.table.rows }]
      : item.sheets.map((sheet) => ({
          sheet: sheet.index,
          columns: sheet.columns,
          rows: sheet.rows
        }))
  for (const table of tables) {
    void import_rows(db, sourceTableName(sourceId, table.sheet), table.rows as DataRow[], {
      columns: table.columns,
      transaction: false,
      refreshPostalReference: false
    })
  }
}

const prepareUploads = async (files: File[]): Promise<PreparedUpload[]> => {
  const prepared: PreparedUpload[] = []
  const seen = new Set<string>()
  for (const file of files) {
    const fileType = inferFileType(file.name)
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
    const storageName = normalize_knowledge_name(originalName.toLowerCase(), {
      preserve_extension: true
    })
    if (seen.has(storageName)) {
      throw new KnowledgeImportError(
        409,
        'filename_conflict',
        `${originalName} est envoyé plusieurs fois.`
      )
    }
    seen.add(storageName)
    const source = findKnowledgeSourceByStorageName(storageName)
    if (
      source &&
      source.originalName.toLocaleLowerCase('fr') !== originalName.toLocaleLowerCase('fr')
    ) {
      throw new KnowledgeImportError(
        409,
        'filename_conflict',
        `${originalName} entre en conflit avec ${source.originalName}.`
      )
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    const contentHash = hashBytes(bytes)
    const changed = source?.contentHash !== contentHash
    if (!changed) {
      prepared.push({
        fileType,
        originalName,
        storageName,
        source,
        contentHash,
        sizeBytes: bytes.byteLength,
        changed: false,
        coreContract,
        markdown: null,
        table: null,
        sheets: []
      })
      continue
    }
    try {
      const parsed = await parseKnowledgeUpload(fileType, bytes)
      prepared.push({
        fileType,
        originalName,
        storageName,
        source,
        contentHash,
        sizeBytes: bytes.byteLength,
        changed: true,
        coreContract,
        markdown: parsed.kind === 'document' ? parsed.markdown : null,
        table: parsed.kind === 'table' ? parsed.table : null,
        sheets: parsed.kind === 'workbook' ? parsed.sheets : []
      })
    } catch (error) {
      if (error instanceof KnowledgeImportError || error instanceof KnowledgeCsvError) throw error
      if (error instanceof KnowledgeSpreadsheetError) {
        throw new KnowledgeImportError(400, error.code, error.message)
      }
      throw new KnowledgeImportError(400, 'invalid_file', `${originalName} ne peut pas être lu.`)
    }
  }
  return prepared
}

const conflictMessage = (error: unknown): string | null => {
  if (!(error instanceof Error)) return null
  if (
    error.message.includes('globally unique') ||
    error.message.includes('Reserved Core Data title') ||
    error.message.includes('Knowledge title already used') ||
    error.message.includes('Unknown knowledge profile') ||
    error.message.includes('Invalid Core Data source') ||
    error.message.includes('Spreadsheet structure')
  ) {
    return error.message
  }
  if (error.message.includes('UNIQUE')) return 'upload_conflict'
  return null
}

const applyUploads = (
  prepared: PreparedUpload[],
  origin: 'ui' | 'cli',
  validProfileIds: ReadonlySet<string>
): { sources: ImportedKnowledgeSource[]; shouldBuild: boolean } => {
  if (prepared.every((item) => item.source && !item.changed)) {
    return {
      sources: prepared.flatMap((item) =>
        item.source ? [{ source: item.source, changed: false }] : []
      ),
      shouldBuild: false
    }
  }
  const db = openDatastore()
  try {
    return db
      .transaction(() => {
        const results: ImportedKnowledgeSource[] = []
        let shouldBuild = false
        for (const item of prepared) {
          if (item.source && !item.changed) {
            results.push({ source: item.source, changed: false })
            continue
          }
          const entries = entriesForUpload(
            item.fileType,
            item.originalName,
            item.sheets,
            item.source?.entries ?? [],
            item.coreContract
          )
          const metadata = {
            originalName: item.originalName,
            fileType: item.fileType,
            sizeBytes: item.sizeBytes,
            contentHash: item.contentHash,
            origin,
            entries
          }
          if (item.source) {
            const wasAssigned = isAssigned(item.source)
            dropSourceTables(db, item.source.id)
            const source = updateKnowledgeSourceFileInDb(
              db,
              item.source.id,
              metadata,
              validProfileIds,
              item.markdown
            )
            if (!source) throw new Error('Knowledge source disappeared during upload')
            writeTables(db, source.id, item)
            if (origin === 'cli' && (wasAssigned || isAssigned(source))) shouldBuild = true
            results.push({ source, changed: true })
            continue
          }
          const source = insertKnowledgeSourceInDb(
            db,
            { storageName: item.storageName, ...metadata },
            validProfileIds,
            item.markdown
          )
          writeTables(db, source.id, item)
          results.push({ source, changed: true })
        }
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
  origin: 'ui' | 'cli'
): Promise<{ sources: ImportedKnowledgeSource[]; shouldBuild: boolean }> => {
  if (files.length === 0) {
    throw new KnowledgeImportError(400, 'missing_file', 'Aucun fichier fourni.')
  }
  const validProfileIds = new Set((await listKnowledgeProfiles()).map((profile) => profile.id))
  return applyUploads(await prepareUploads(files), origin, validProfileIds)
}
