import {
  KnowledgeBuildDocumentSchema,
  type KnowledgeBuild,
  type KnowledgeBuildDocument,
  type KnowledgeBuildTrigger
} from './catalog-schema'
import {
  getRecord,
  parseBuildRow,
  withKnowledgeDb,
  writeBuild,
  type KnowledgeRecordRow
} from './catalog-store'

export const createKnowledgeBuild = (
  trigger: KnowledgeBuildTrigger,
  requestedBy: string | null,
  mirrorTables: KnowledgeBuildDocument['mirrorTables'] = [],
  ownerId = 'local',
  items: KnowledgeBuildDocument['items'] = [],
  service?: string
): KnowledgeBuild => {
  const now = new Date().toISOString()
  const document = KnowledgeBuildDocumentSchema.parse({
    status: 'queued',
    trigger,
    requestedBy,
    catalogFingerprint: null,
    startedAt: null,
    finishedAt: null,
    mirrorTables,
    ownerId,
    heartbeatAt: now,
    items,
    diagnostics: []
  })
  const id = Bun.randomUUIDv7()
  return withKnowledgeDb(service, (db) => {
    db.run(
      "INSERT INTO knowledge_records (id, kind, document, created_at, updated_at) VALUES (?, 'build', ?, ?, ?)",
      [id, JSON.stringify(document), now, now]
    )
    return { id, ...document, createdAt: now, updatedAt: now }
  })
}

export const getKnowledgeBuild = (id: string, service?: string): KnowledgeBuild | null =>
  withKnowledgeDb(service, (db) => {
    const row = getRecord(db, id, 'build')
    return row ? parseBuildRow(row) : null
  })

export const getActiveKnowledgeBuild = (service?: string): KnowledgeBuild | null =>
  withKnowledgeDb(service, (db) => {
    const row = db
      .query<KnowledgeRecordRow, []>(
        `SELECT id, kind, document, created_at, updated_at
         FROM knowledge_records
         WHERE kind = 'build'
           AND json_extract(document, '$.status') IN ('queued', 'running')
         LIMIT 1`
      )
      .get()
    return row ? parseBuildRow(row) : null
  })

export const updateKnowledgeBuild = (
  id: string,
  update: Partial<KnowledgeBuildDocument>,
  service?: string
): KnowledgeBuild | null =>
  withKnowledgeDb(service, (db) =>
    db
      .transaction(() => {
        const row = getRecord(db, id, 'build')
        if (!row) return null
        return writeBuild(db, parseBuildRow(row), update)
      })
      .immediate()
  )

export const completeKnowledgeBuild = (
  id: string,
  update: Pick<
    KnowledgeBuildDocument,
    'catalogFingerprint' | 'diagnostics' | 'items' | 'mirrorTables'
  >,
  service?: string
): KnowledgeBuild | null =>
  withKnowledgeDb(service, (db) =>
    db
      .transaction(() => {
        const row = getRecord(db, id, 'build')
        if (!row) return null
        const current = parseBuildRow(row)
        return writeBuild(db, current, {
          status: 'succeeded',
          finishedAt: new Date().toISOString(),
          heartbeatAt: new Date().toISOString(),
          ...update
        })
      })
      .immediate()
  )

export const listKnowledgeBuilds = (service?: string): KnowledgeBuild[] =>
  withKnowledgeDb(service, (db) =>
    db
      .query<KnowledgeRecordRow, []>(
        "SELECT id, kind, document, created_at, updated_at FROM knowledge_records WHERE kind = 'build' ORDER BY created_at DESC"
      )
      .all()
      .map(parseBuildRow)
  )

export const purgeOldKnowledgeBuilds = (service?: string, now = new Date()): number => {
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  return withKnowledgeDb(service, (db) => {
    return db.run(
      `DELETE FROM knowledge_records
       WHERE kind = 'build'
         AND created_at < ?
         AND json_extract(document, '$.status') IN ('succeeded', 'failed')`,
      [cutoff]
    ).changes
  })
}

export const failInterruptedKnowledgeBuilds = (
  service?: string,
  staleBefore = new Date(Date.now() - 5 * 60 * 1000)
): number => {
  const now = new Date().toISOString()
  const cutoff = staleBefore.toISOString()
  return withKnowledgeDb(service, (db) => {
    const rows = db
      .query<KnowledgeRecordRow, []>(
        `SELECT id, kind, document, created_at, updated_at
         FROM knowledge_records
         WHERE kind = 'build'
           AND json_extract(document, '$.status') IN ('queued', 'running')`
      )
      .all()
      .filter((row) => parseBuildRow(row).heartbeatAt < cutoff)
    db.transaction(() => {
      for (const row of rows) {
        const current = parseBuildRow(row)
        writeBuild(db, current, {
          status: 'failed',
          finishedAt: now,
          heartbeatAt: now,
          diagnostics: [
            ...current.diagnostics,
            {
              level: 'error',
              code: 'interrupted',
              message: 'La reconstruction a été interrompue.',
              subject: null
            }
          ]
        })
      }
    }).immediate()
    return rows.length
  })
}
