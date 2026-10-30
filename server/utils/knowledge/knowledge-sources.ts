import { Database } from 'bun:sqlite'

import { assertNoOutputCollisions, catalogFingerprint } from './catalog-rules'
import {
  type KnowledgeCatalogSnapshot,
  type KnowledgeEntry,
  type KnowledgeEntryInput,
  KnowledgeEntrySchema,
  type KnowledgeSource,
  type KnowledgeSourceDocument,
  type KnowledgeSourceDocumentInput,
  KnowledgeSourceDocumentSchema
} from './catalog-schema'
import {
  getRecord,
  type KnowledgeRecordRow,
  parseSourceRow,
  sourceRows,
  withKnowledgeDb,
  writeSourceDocument
} from './catalog-store'
import { dropSourceSheet, dropSourceTables } from './source-tables'
import { stringifyStoredSourceDocument } from './stored'

const replaceSource = (
  db: Database,
  sources: KnowledgeSource[],
  id: string,
  document: KnowledgeSourceDocument,
  validProfileIds?: ReadonlySet<string>,
  content?: string | null
): KnowledgeSource | null => {
  const index = sources.findIndex((source) => source.id === id)
  if (index === -1) return null
  const current = sources[index]!
  const updated = { ...current, ...document }
  sources[index] = updated
  assertNoOutputCollisions(sources, validProfileIds)
  return writeSourceDocument(db, id, document, current.createdAt, content)
}

const assertStableSpreadsheet = (
  current: KnowledgeSource,
  entries: KnowledgeSource['entries']
): void => {
  if (current.fileType !== 'xlsx' || current.entries.length === 0) return
  for (const entry of entries) {
    const previous = current.entries.find((candidate) => candidate.sheet === entry.sheet)
    if (!previous || previous.sheetName !== entry.sheetName) {
      throw new Error('Spreadsheet structure cannot change')
    }
  }
}

export const listKnowledgeSources = (): KnowledgeSource[] =>
  withKnowledgeDb((db) => sourceRows(db).map(parseSourceRow))

export const listKnowledgeSourceContents = (): Array<
  KnowledgeSource & { content: string | null }
> =>
  withKnowledgeDb((db) =>
    db
      .query<KnowledgeRecordRow & { content: string | null }, []>(
        `SELECT id, kind, document, content, created_at, updated_at
         FROM knowledge_records WHERE kind = 'source' ORDER BY created_at`
      )
      .all()
      .map((row) => ({ ...parseSourceRow(row), content: row.content }))
  )

export const findKnowledgeSourceByStorageName = (storageName: string): KnowledgeSource | null =>
  withKnowledgeDb((db) => {
    const row = db
      .query<KnowledgeRecordRow, [string]>(
        `SELECT id, kind, document, created_at, updated_at
         FROM knowledge_records
         WHERE kind = 'source' AND json_extract(document, '$.storage_name') = ?`
      )
      .get(storageName)
    return row ? parseSourceRow(row) : null
  })

export const getKnowledgeSource = (id: string): KnowledgeSource | null =>
  withKnowledgeDb((db) => {
    const row = getRecord(db, id, 'source')
    return row ? parseSourceRow(row) : null
  })

export const insertKnowledgeSourceInDb = (
  db: Database,
  document: KnowledgeSourceDocumentInput,
  validProfileIds: ReadonlySet<string> | undefined,
  content: string | null,
  id = Bun.randomUUIDv7()
): KnowledgeSource => {
  const parsed = KnowledgeSourceDocumentSchema.parse(document)
  const now = new Date().toISOString()
  const sources = sourceRows(db).map(parseSourceRow)
  assertNoOutputCollisions(
    [...sources, { id, ...parsed, createdAt: now, updatedAt: now }],
    validProfileIds
  )
  db.run(
    "INSERT INTO knowledge_records (id, kind, document, content, created_at, updated_at) VALUES (?, 'source', ?, ?, ?, ?)",
    [id, stringifyStoredSourceDocument(parsed), content, now, now]
  )
  return { id, ...parsed, createdAt: now, updatedAt: now }
}

export const insertKnowledgeSource = (
  document: KnowledgeSourceDocumentInput,
  validProfileIds?: ReadonlySet<string>,
  content: string | null = null
): KnowledgeSource =>
  withKnowledgeDb((db) => {
    let source!: KnowledgeSource
    db.transaction(() => {
      source = insertKnowledgeSourceInDb(db, document, validProfileIds, content)
    }).immediate()
    return source
  })

export const updateKnowledgeSourceFileInDb = (
  db: Database,
  id: string,
  update: Pick<
    KnowledgeSourceDocument,
    'originalName' | 'fileType' | 'sizeBytes' | 'contentHash' | 'origin'
  > & { entries?: KnowledgeEntry[] },
  validProfileIds: ReadonlySet<string> | undefined,
  content: string | null
): KnowledgeSource | null => {
  const sources = sourceRows(db).map(parseSourceRow)
  const current = sources.find((source) => source.id === id)
  if (!current) return null
  return replaceSource(
    db,
    sources,
    id,
    KnowledgeSourceDocumentSchema.parse({
      storageName: current.storageName,
      entries: update.entries ?? current.entries,
      ...update
    }),
    validProfileIds,
    content
  )
}

export const replaceKnowledgeSourceEntries = (
  id: string,
  entries: KnowledgeEntryInput[],
  validProfileIds: ReadonlySet<string>,
  expectedUpdatedAt?: string
): KnowledgeSource | null =>
  withKnowledgeDb((db) =>
    db
      .transaction(() => {
        const sources = sourceRows(db).map(parseSourceRow)
        const current = sources.find((source) => source.id === id)
        if (!current) return null
        if (expectedUpdatedAt && current.updatedAt !== expectedUpdatedAt) {
          throw new Error('Knowledge source was modified by another administrator')
        }
        const nextEntries = entries.map((entry) => KnowledgeEntrySchema.parse(entry))
        assertStableSpreadsheet(current, nextEntries)
        for (const entry of current.entries) {
          if (entry.sheet === null) continue
          if (nextEntries.some((candidate) => candidate.sheet === entry.sheet)) continue
          dropSourceSheet(db, id, entry.sheet)
        }
        return replaceSource(
          db,
          sources,
          id,
          KnowledgeSourceDocumentSchema.parse({
            storageName: current.storageName,
            originalName: current.originalName,
            fileType: current.fileType,
            sizeBytes: current.sizeBytes,
            contentHash: current.contentHash,
            origin: current.origin,
            entries
          }),
          validProfileIds
        )
      })
      .immediate()
  )

export const deleteKnowledgeSource = (id: string): KnowledgeSource | null =>
  withKnowledgeDb((db) =>
    db
      .transaction(() => {
        const row = getRecord(db, id, 'source')
        if (!row) return null
        dropSourceTables(db, id)
        db.run('DELETE FROM knowledge_records WHERE id = ?', [id])
        return parseSourceRow(row)
      })
      .immediate()
  )

export const getKnowledgeCatalogSnapshot = (): KnowledgeCatalogSnapshot => {
  const sources = listKnowledgeSources()
  return { sources, fingerprint: catalogFingerprint(sources) }
}
