import { Database } from 'bun:sqlite'

import { assertNoOutputCollisions, catalogFingerprint } from './catalog-rules'
import {
  KnowledgeSourceDocumentSchema,
  type KnowledgeCatalogSnapshot,
  type KnowledgeEntry,
  type KnowledgeEntryInput,
  type KnowledgeSource,
  type KnowledgeSourceDocument,
  type KnowledgeSourceDocumentInput
} from './catalog-schema'
import {
  getRecord,
  parseSourceRow,
  sourceRows,
  withKnowledgeDb,
  writeSourceDocument,
  type KnowledgeRecordRow
} from './catalog-store'

const replaceSource = (
  db: Database,
  sources: KnowledgeSource[],
  id: string,
  document: KnowledgeSourceDocument,
  validProfileIds?: ReadonlySet<string>
): KnowledgeSource | null => {
  const index = sources.findIndex((source) => source.id === id)
  if (index === -1) return null
  const current = sources[index]!
  const updated = { ...current, ...document }
  sources[index] = updated
  assertNoOutputCollisions(sources, validProfileIds)
  return writeSourceDocument(db, id, document, current.createdAt)
}

export const listKnowledgeSources = (service?: string): KnowledgeSource[] =>
  withKnowledgeDb(service, (db) => sourceRows(db).map(parseSourceRow))

export const findKnowledgeSourceByStorageName = (
  storageName: string,
  service?: string
): KnowledgeSource | null =>
  withKnowledgeDb(service, (db) => {
    const row = db
      .query<KnowledgeRecordRow, [string]>(
        `SELECT id, kind, document, created_at, updated_at
         FROM knowledge_records
         WHERE kind = 'source' AND json_extract(document, '$.storageName') = ?`
      )
      .get(storageName)
    return row ? parseSourceRow(row) : null
  })

export const getKnowledgeSource = (id: string, service?: string): KnowledgeSource | null =>
  withKnowledgeDb(service, (db) => {
    const row = getRecord(db, id, 'source')
    return row ? parseSourceRow(row) : null
  })

export const insertKnowledgeSource = (
  document: KnowledgeSourceDocumentInput,
  service?: string,
  validProfileIds?: ReadonlySet<string>
): KnowledgeSource => {
  const parsed = KnowledgeSourceDocumentSchema.parse(document)
  return withKnowledgeDb(service, (db) => {
    const now = new Date().toISOString()
    const id = Bun.randomUUIDv7()
    db.transaction(() => {
      const sources = sourceRows(db).map(parseSourceRow)
      assertNoOutputCollisions(
        [...sources, { id, ...parsed, createdAt: now, updatedAt: now }],
        validProfileIds
      )
      db.run(
        "INSERT INTO knowledge_records (id, kind, document, created_at, updated_at) VALUES (?, 'source', ?, ?, ?)",
        [id, JSON.stringify(parsed), now, now]
      )
    }).immediate()
    return { id, ...parsed, createdAt: now, updatedAt: now }
  })
}

export const updateKnowledgeSourceFile = (
  id: string,
  update: Pick<
    KnowledgeSourceDocument,
    'originalName' | 'fileType' | 'sizeBytes' | 'contentHash' | 'origin'
  > & { entries?: KnowledgeEntry[] },
  validProfileIds?: ReadonlySet<string>,
  service?: string
): KnowledgeSource | null =>
  withKnowledgeDb(service, (db) =>
    db
      .transaction(() => {
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
          validProfileIds
        )
      })
      .immediate()
  )

export const replaceKnowledgeSourceEntries = (
  id: string,
  entries: KnowledgeEntryInput[],
  validProfileIds: ReadonlySet<string>,
  expectedUpdatedAt?: string,
  service?: string
): KnowledgeSource | null =>
  withKnowledgeDb(service, (db) =>
    db
      .transaction(() => {
        const sources = sourceRows(db).map(parseSourceRow)
        const current = sources.find((source) => source.id === id)
        if (!current) return null
        if (expectedUpdatedAt && current.updatedAt !== expectedUpdatedAt) {
          throw new Error('Knowledge source was modified by another administrator')
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

export const deleteKnowledgeSource = (id: string, service?: string): KnowledgeSource | null =>
  withKnowledgeDb(service, (db) =>
    db
      .transaction(() => {
        const row = getRecord(db, id, 'source')
        if (!row) return null
        db.run('DELETE FROM knowledge_records WHERE id = ?', [id])
        return parseSourceRow(row)
      })
      .immediate()
  )

export const getKnowledgeCatalogSnapshot = (service?: string): KnowledgeCatalogSnapshot => {
  const sources = listKnowledgeSources(service)
  return { sources, fingerprint: catalogFingerprint(sources) }
}
