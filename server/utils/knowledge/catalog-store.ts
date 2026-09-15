import { Database } from 'bun:sqlite'

import { datastorePaths } from '../paths'
import {
  KnowledgeBuildDocumentSchema,
  KnowledgeSourceDocumentSchema,
  type KnowledgeBuild,
  type KnowledgeBuildDocument,
  type KnowledgeSource,
  type KnowledgeSourceDocument
} from './catalog-schema'

export type KnowledgeRecordRow = {
  id: string
  kind: 'source' | 'build'
  document: string
  created_at: string
  updated_at: string
}

export const withKnowledgeDb = <T>(fn: (db: Database) => T): T => {
  const db = new Database(datastorePaths().database)
  try {
    return fn(db)
  } finally {
    db.close()
  }
}

export const parseSourceRow = (row: KnowledgeRecordRow): KnowledgeSource => ({
  id: row.id,
  ...KnowledgeSourceDocumentSchema.parse(JSON.parse(row.document)),
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

export const parseBuildRow = (row: KnowledgeRecordRow): KnowledgeBuild => ({
  id: row.id,
  ...KnowledgeBuildDocumentSchema.parse(JSON.parse(row.document)),
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

export const sourceRows = (db: Database): KnowledgeRecordRow[] =>
  db
    .query<KnowledgeRecordRow, []>(
      "SELECT id, kind, document, created_at, updated_at FROM knowledge_records WHERE kind = 'source' ORDER BY created_at"
    )
    .all()

export const getRecord = (
  db: Database,
  id: string,
  kind: 'source' | 'build'
): KnowledgeRecordRow | null =>
  db
    .query<KnowledgeRecordRow, [string, string]>(
      'SELECT id, kind, document, created_at, updated_at FROM knowledge_records WHERE id = ? AND kind = ?'
    )
    .get(id, kind) ?? null

const buildDocumentOf = (build: KnowledgeBuild): KnowledgeBuildDocument => {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...document } = build
  return document
}

export const writeBuild = (
  db: Database,
  current: KnowledgeBuild,
  patch: Partial<KnowledgeBuildDocument>
): KnowledgeBuild => {
  const document = KnowledgeBuildDocumentSchema.parse({ ...buildDocumentOf(current), ...patch })
  const now = new Date().toISOString()
  db.run('UPDATE knowledge_records SET document = ?, updated_at = ? WHERE id = ?', [
    JSON.stringify(document),
    now,
    current.id
  ])
  return { id: current.id, ...document, createdAt: current.createdAt, updatedAt: now }
}

export const writeSourceDocument = (
  db: Database,
  id: string,
  document: KnowledgeSourceDocument,
  createdAt: string
): KnowledgeSource => {
  const now = new Date().toISOString()
  db.run('UPDATE knowledge_records SET document = ?, updated_at = ? WHERE id = ?', [
    JSON.stringify(document),
    now,
    id
  ])
  return { id, ...document, createdAt, updatedAt: now }
}
