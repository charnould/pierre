import { Database } from 'bun:sqlite'

import { generate_metadata } from './generate-metadata'
import { ingest_files, setupKnowledgeDirectories } from './ingest-files'
import { scrape_wikipedia } from './scrape-wikipedia'

const COMMUNITY_FLAG = '--community'
const COMMUNITY_TYPE = 'community'

export type KnowledgeBuildEvent = {
  source: 'cli' | 'pipeline'
  kind: 'action' | 'info' | 'warning' | 'error'
  code: string
  subject: string | null
}

export function save_events(events: KnowledgeBuildEvent[]): void {
  const db = new Database(`datastores/${Bun.env['SERVICE']}/datastore.sqlite`)
  const now = new Date().toISOString()

  const hadCliUploads =
    db
      .query<{ n: number }, []>(
        "SELECT COUNT(*) as n FROM knowledge_build WHERE source='cli' AND code='CLI_UPLOAD' AND DATE(created_at) = DATE('now')"
      )
      .get()!.n > 0

  const hadMetadataUpload =
    db
      .query<{ n: number }, []>(
        "SELECT COUNT(*) as n FROM knowledge_build WHERE source='cli' AND code='CLI_UPLOAD' AND subject='_metadata.xlsx' AND DATE(created_at) = DATE('now')"
      )
      .get()!.n > 0

  db.run("DELETE FROM knowledge_build WHERE source = 'pipeline'")
  db.run("DELETE FROM knowledge_build WHERE source = 'cli' AND DATE(created_at) < DATE('now')")

  const stmt = db.prepare(
    'INSERT INTO knowledge_build (created_at, source, kind, code, subject) VALUES (?, ?, ?, ?, ?)'
  )

  for (const event of events) {
    stmt.run(now, event.source, event.kind, event.code, event.subject)
  }

  if (hadCliUploads && !hadMetadataUpload) {
    stmt.run(now, 'pipeline', 'warning', 'CLI_UPLOAD_WITHOUT_METADATA', null)
  }

  if (events.length === 0) {
    stmt.run(now, 'pipeline', 'info', 'PIPELINE_OK', null)
  }
}

export const run_pipeline = async (knowledgeType?: string): Promise<void> => {
  const events: KnowledgeBuildEvent[] = []

  try {
    const startTime = performance.now()

    if (knowledgeType === COMMUNITY_TYPE) await scrape_wikipedia()

    // Always setup knowledge directories and copy community data,
    // even when _metadata.xlsx is missing
    await setupKnowledgeDirectories()

    const { files, anomalies: metaAnomalies } = await generate_metadata()
    const metadataMissing = metaAnomalies.some((a) => a.code === 'METADATA_MISSING')

    for (const a of metaAnomalies) {
      events.push({
        source: 'pipeline',
        kind: a.code === 'METADATA_MISSING' ? 'error' : 'warning',
        code: a.code,
        subject: a.subject
      })
    }

    if (!metadataMissing) {
      const { anomalies: ingestAnomalies } = await ingest_files(files)
      for (const a of ingestAnomalies) {
        const kind =
          a.code === 'PROFILE_MISSING_IN_ASSETS'
            ? 'error'
            : a.code === 'METADATA_NOT_IN_FILES'
              ? 'warning'
              : 'info'
        events.push({
          source: 'pipeline',
          kind,
          code: a.code,
          subject: a.subject
        })
      }
    }

    const durationSeconds = ((performance.now() - startTime) / 1000).toFixed(3)
    console.info(`✅ Pipeline completed in ${durationSeconds}s`)
  } catch (e) {
    console.error('❌ Pipeline execution failed', e)
  } finally {
    save_events(events)
  }
}

if (Bun.argv.includes(COMMUNITY_FLAG)) {
  await run_pipeline(COMMUNITY_TYPE)
}
