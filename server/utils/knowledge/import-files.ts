import { mkdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'

import * as XLSX from 'xlsx'

import {
  coreDataContractForFilename,
  resemblesCoreDataFilename,
  type CoreDataContract
} from '../../../shared/core-data'
import { isKnowledgeEntryAssigned, normalize_knowledge_name } from '../../../shared/knowledge'
import { datastorePaths } from '../paths'
import {
  deleteKnowledgeSource,
  findKnowledgeSourceByStorageName,
  insertKnowledgeSource,
  updateKnowledgeSourceFile,
  type KnowledgeEntry,
  type KnowledgeSource
} from './catalog'
import { KnowledgeCsvError, loadKnowledgeCsv } from './ingest-files'
import { listKnowledgeProfiles } from './profiles'

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
  file: File
  fileType: FileType
  originalName: string
  storageName: string
  target: string
  temporary: string
  source: KnowledgeSource | null
  contentHash: string
  changed: boolean
  coreContract: CoreDataContract | null
  sheets: Array<{ index: number; name: string }>
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

const listWorkbookSheets = async (path: string) => {
  const workbook = XLSX.read(await Bun.file(path).arrayBuffer(), { bookSheets: true })
  return workbook.SheetNames.map((name, index) => ({ index, name }))
}

const hashFile = async (path: string): Promise<string> => {
  const hasher = new Bun.CryptoHasher('sha256')
  const reader = Bun.file(path).stream().getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    hasher.update(value)
  }
  return hasher.digest('hex')
}

const stemWithoutExtension = (filename: string): string => filename.replace(/\.[^.]+$/, '')

const entriesForUpload = (
  fileType: FileType,
  originalName: string,
  sheets: Awaited<ReturnType<typeof listWorkbookSheets>>,
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
            sheetName: null,
            headerRow: null
          }
        : {
            title: coreContract?.table ?? stemWithoutExtension(originalName),
            sheet: null,
            sheetName: null,
            headerRow: null,
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
          headerRow: 0,
          profileIds: [],
          moduleIds: []
        }
  })
}

const isAssigned = (source: KnowledgeSource): boolean =>
  source.entries.some((entry) => isKnowledgeEntryAssigned(entry))

const removeAll = async (paths: readonly string[]): Promise<void> => {
  await Promise.allSettled(paths.map((path) => rm(path, { force: true })))
}

const prepareUploads = async (files: File[], filesRoot: string): Promise<PreparedUpload[]> => {
  const prepared: PreparedUpload[] = []
  try {
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
      const target = join(filesRoot, storageName)
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
      const temporary = join(filesRoot, `.upload-${Bun.randomUUIDv7()}`)
      await Bun.write(temporary, file)
      try {
        const contentHash = await hashFile(temporary)
        const changed = source?.contentHash !== contentHash
        if (changed && fileType === 'csv') await loadKnowledgeCsv(temporary)
        prepared.push({
          file,
          fileType,
          originalName,
          storageName,
          target,
          temporary,
          source,
          contentHash,
          changed,
          coreContract,
          sheets: changed && fileType === 'xlsx' ? await listWorkbookSheets(temporary) : []
        })
      } catch (error) {
        await rm(temporary, { force: true })
        if (error instanceof KnowledgeImportError || error instanceof KnowledgeCsvError) throw error
        throw fileType === 'csv'
          ? new KnowledgeImportError(
              400,
              'invalid_csv',
              error instanceof Error ? error.message : 'Le CSV est invalide.'
            )
          : new KnowledgeImportError(400, 'invalid_file', `${originalName} ne peut pas être lu.`)
      }
    }
    return prepared
  } catch (error) {
    await removeAll(prepared.map((item) => item.temporary))
    throw error
  }
}

const restoreSource = (previous: KnowledgeSource, validProfileIds: ReadonlySet<string>): void => {
  updateKnowledgeSourceFile(
    previous.id,
    {
      originalName: previous.originalName,
      fileType: previous.fileType,
      sizeBytes: previous.sizeBytes,
      contentHash: previous.contentHash,
      origin: previous.origin,
      entries: previous.entries
    },
    validProfileIds
  )
}

const applyUploads = async (
  prepared: PreparedUpload[],
  origin: 'ui' | 'cli',
  validProfileIds: ReadonlySet<string>
): Promise<{ sources: ImportedKnowledgeSource[]; shouldBuild: boolean }> => {
  const applied: Array<{
    item: PreparedUpload
    source: KnowledgeSource
    backup: string | null
  }> = []
  const results: ImportedKnowledgeSource[] = []
  let shouldBuild = false

  try {
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
        sizeBytes: item.file.size,
        contentHash: item.contentHash,
        origin,
        entries
      }

      if (item.source) {
        const wasAssigned = isAssigned(item.source)
        const backup = (await Bun.file(item.target).exists())
          ? `${item.target}.rollback-${Bun.randomUUIDv7()}`
          : null
        if (backup) await rename(item.target, backup)
        await rename(item.temporary, item.target)
        try {
          const source = updateKnowledgeSourceFile(item.source.id, metadata, validProfileIds)
          if (!source) throw new Error('Knowledge source disappeared during upload')
          if (origin === 'cli' && (wasAssigned || isAssigned(source))) shouldBuild = true
          applied.push({ item, source, backup })
          results.push({ source, changed: true })
        } catch (error) {
          await rm(item.target, { force: true })
          if (backup) await rename(backup, item.target)
          throw error
        }
        continue
      }

      let source: KnowledgeSource
      try {
        source = insertKnowledgeSource(
          { storageName: item.storageName, ...metadata },
          validProfileIds
        )
      } catch (error) {
        if (findKnowledgeSourceByStorageName(item.storageName)) {
          throw new KnowledgeImportError(
            409,
            'upload_conflict',
            `${item.originalName} est déjà en cours d’import.`
          )
        }
        if (
          error instanceof Error &&
          (error.message.includes('globally unique') ||
            error.message.includes('Reserved Core Data title') ||
            error.message.includes('Knowledge title already used') ||
            error.message.includes('Unknown knowledge profile') ||
            error.message.includes('Invalid Core Data source'))
        ) {
          throw new KnowledgeImportError(409, 'source_conflict', error.message)
        }
        throw error
      }
      try {
        await rename(item.temporary, item.target)
      } catch (error) {
        deleteKnowledgeSource(source.id)
        throw error
      }
      applied.push({ item, source, backup: null })
      results.push({ source, changed: true })
    }
    return { sources: results, shouldBuild }
  } catch (error) {
    for (const step of applied.reverse()) {
      if (step.item.source) restoreSource(step.item.source, validProfileIds)
      else deleteKnowledgeSource(step.source.id)
      if (step.backup) {
        await rm(step.item.target, { force: true })
        await rename(step.backup, step.item.target)
      } else if (!step.item.source) {
        await rm(step.item.target, { force: true })
      }
    }
    throw error
  } finally {
    await removeAll([
      ...prepared.map((item) => item.temporary),
      ...applied.map((step) => step.backup).filter((path): path is string => path !== null)
    ])
  }
}

export const importKnowledgeFiles = async (
  files: File[],
  origin: 'ui' | 'cli'
): Promise<{ sources: ImportedKnowledgeSource[]; shouldBuild: boolean }> => {
  if (files.length === 0) {
    throw new KnowledgeImportError(400, 'missing_file', 'Aucun fichier fourni.')
  }
  const paths = datastorePaths()
  await mkdir(paths.files, { recursive: true })
  const validProfileIds = new Set((await listKnowledgeProfiles()).map((profile) => profile.id))
  return await applyUploads(await prepareUploads(files, paths.files), origin, validProfileIds)
}
