import { Database } from 'bun:sqlite'

import type { BusinessModuleId } from '../../../shared/modules'
import { assertNoOutputCollisions, catalogFingerprint } from './catalog-rules'
import {
  type KnowledgeCatalogSnapshot,
  type KnowledgeSource,
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
import { dropSourceTable } from './source-tables'
import { stringifyStoredSourceDocument } from './stored'

export const assertKnowledgeCatalogValidInDb = (
  db: Database,
  validProfileIds?: ReadonlySet<string>
): void => {
  assertNoOutputCollisions(sourceRows(db).map(parseSourceRow), validProfileIds)
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

export const findKnowledgeSourcesByFilename = (originalName: string): KnowledgeSource[] => {
  const target = originalName.normalize('NFC').toLocaleLowerCase('fr')
  return listKnowledgeSources().filter(
    (source) => source.originalName.toLocaleLowerCase('fr') === target
  )
}

export const getKnowledgeSource = (id: string): KnowledgeSource | null =>
  withKnowledgeDb((db) => {
    const row = getRecord(db, id, 'source')
    return row ? parseSourceRow(row) : null
  })

export const insertKnowledgeSourceInDb = (
  db: Database,
  document: KnowledgeSourceDocumentInput,
  content: string | null,
  id = Bun.randomUUIDv7()
): KnowledgeSource => {
  const parsed = KnowledgeSourceDocumentSchema.parse(document)
  const now = new Date().toISOString()
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
  withKnowledgeDb((db) =>
    db
      .transaction(() => {
        const source = insertKnowledgeSourceInDb(db, document, content)
        assertKnowledgeCatalogValidInDb(db, validProfileIds)
        return source
      })
      .immediate()
  )

export const updateKnowledgeSourceFileInDb = (
  db: Database,
  id: string,
  update: Partial<KnowledgeSourceDocumentInput>,
  content?: string | null
): KnowledgeSource | null => {
  const row = getRecord(db, id, 'source')
  if (!row) return null
  const current = parseSourceRow(row)
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...currentDoc } = current
  return writeSourceDocument(
    db,
    id,
    KnowledgeSourceDocumentSchema.parse({
      ...currentDoc,
      ...update
    }),
    current.createdAt,
    content
  )
}

export const deleteKnowledgeSourceInDb = (db: Database, id: string): KnowledgeSource | null => {
  const row = getRecord(db, id, 'source')
  if (!row) return null
  dropSourceTable(db, id)
  db.run('DELETE FROM knowledge_records WHERE id = ?', [id])
  return parseSourceRow(row)
}

export const updateKnowledgeSourceMetadata = (
  id: string,
  patch: { title: string; profileIds: string[]; moduleIds: BusinessModuleId[] },
  validProfileIds: ReadonlySet<string>,
  expectedUpdatedAt?: string
): KnowledgeSource | null =>
  withKnowledgeDb((db) =>
    db
      .transaction(() => {
        const row = getRecord(db, id, 'source')
        if (!row) return null
        const current = parseSourceRow(row)
        if (expectedUpdatedAt && current.updatedAt !== expectedUpdatedAt) {
          throw new Error('Knowledge source was modified by another administrator')
        }
        const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...currentDoc } = current
        const updated = writeSourceDocument(
          db,
          id,
          KnowledgeSourceDocumentSchema.parse({
            ...currentDoc,
            title: patch.title,
            profileIds: patch.profileIds,
            moduleIds: patch.moduleIds
          }),
          current.createdAt
        )
        assertKnowledgeCatalogValidInDb(db, validProfileIds)
        return updated
      })
      .immediate()
  )

export const deleteKnowledgeSource = (id: string): KnowledgeSource | null =>
  withKnowledgeDb((db) => db.transaction(() => deleteKnowledgeSourceInDb(db, id)).immediate())

export const getKnowledgeCatalogSnapshot = (): KnowledgeCatalogSnapshot => {
  const sources = listKnowledgeSources()
  return { sources, fingerprint: catalogFingerprint(sources) }
}
