import { Database } from 'bun:sqlite'

import { build_knowledge_databases } from './build-knowledge'
import { generate_metadata } from './generate-metadata'
import { ingest_files, setup_knowledge_directories } from './ingest-files'

/**
 * A single event emitted during a knowledge build (CLI upload or pipeline run).
 * Events are persisted to the `knowledge_build` table by {@link save_events}.
 */
export type KnowledgeBuildEvent = {
  /** Origin of the event: a manual CLI upload or an automated pipeline run. */
  source: 'cli' | 'pipeline'
  /** Severity / nature of the event. */
  kind: 'action' | 'info' | 'warning' | 'error'
  /** Machine-readable event identifier (e.g. `'METADATA_MISSING'`, `'PIPELINE_OK'`). */
  code: string
  /** Optional context for the event (e.g. a filename or profile name). */
  subject: string | null
}

/**
 * Persists a set of pipeline build events to the `knowledge_build` table.
 *
 * Housekeeping rules applied on each call:
 * - All previous `pipeline` rows are deleted.
 * - All `cli` rows older than today are deleted.
 * - If CLI uploads exist today without a `_metadata.xlsx` upload, a
 *   `CLI_UPLOAD_WITHOUT_METADATA` warning is inserted.
 * - If `events` is empty, a `PIPELINE_OK` info row is inserted.
 *
 * @param events - Build events emitted by the current pipeline run.
 * @throws {Error} When the `SERVICE` environment variable is not set or the database is unreachable.
 */
export const save_events = (events: KnowledgeBuildEvent[]): void => {
  const db = new Database(`datastores/${Bun.env['SERVICE']}/datastore.sqlite`)
  const now = new Date().toISOString()

  try {
    const had_cli_uploads =
      db
        .query<{ n: number }, []>(
          "SELECT COUNT(*) as n FROM knowledge_build WHERE source='cli' AND code='CLI_UPLOAD' AND DATE(created_at) = DATE('now')"
        )
        .get()!.n > 0

    const had_metadata_upload =
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

    if (had_cli_uploads && !had_metadata_upload) {
      stmt.run(now, 'pipeline', 'warning', 'CLI_UPLOAD_WITHOUT_METADATA', null)
    }

    if (events.length === 0) {
      stmt.run(now, 'pipeline', 'info', 'PIPELINE_OK', null)
    }
  } finally {
    db.close()
  }
}

/**
 * Runs the full knowledge ingestion pipeline:
 * 1. Sets up per-config knowledge directories and copies community data.
 * 2. Generates and validates metadata from `_metadata.xlsx`.
 * 3. Ingests valid files into each config's knowledge directory.
 * 4. Builds SQLite knowledge databases from the ingested files.
 *
 * Any anomalies detected during the run are saved to the `knowledge_build` table
 * via {@link save_events}. Pipeline errors are caught internally and recorded as
 * `INGEST_FAILED` events rather than propagated, so the function never rejects.
 */
export const run_pipeline = async (): Promise<void> => {
  const events: KnowledgeBuildEvent[] = []

  try {
    const start_time = performance.now()

    // Always setup knowledge directories and copy community data,
    // even when _metadata.xlsx is missing
    let step_start = performance.now()
    await setup_knowledge_directories()
    console.info(`⏱ setup: ${((performance.now() - step_start) / 1000).toFixed(3)}s`)

    step_start = performance.now()
    const { files, anomalies: meta_anomalies } = await generate_metadata()
    console.info(`⏱ metadata: ${((performance.now() - step_start) / 1000).toFixed(3)}s`)
    const metadata_missing = meta_anomalies.some((a) => a.code === 'METADATA_MISSING')

    for (const a of meta_anomalies) {
      events.push({
        source: 'pipeline',
        kind: a.code === 'METADATA_MISSING' ? 'error' : 'warning',
        code: a.code,
        subject: a.subject
      })
    }

    if (!metadata_missing) {
      try {
        step_start = performance.now()
        const { anomalies: ingest_anomalies } = await ingest_files(files)
        console.info(`⏱ ingest: ${((performance.now() - step_start) / 1000).toFixed(3)}s`)
        for (const a of ingest_anomalies) {
          const kind =
            a.code === 'PROFILE_MISSING_IN_ASSETS'
              ? 'error'
              : a.code === 'METADATA_NOT_IN_FILES'
                ? 'warning'
                : 'info'
          events.push({ source: 'pipeline', kind, code: a.code, subject: a.subject })
        }
      } catch (e) {
        console.error('❌ File ingestion failed', e)
        events.push({
          source: 'pipeline',
          kind: 'error',
          code: 'INGEST_FAILED',
          subject: String(e)
        })
      }
    }

    // Always build knowledge databases — even without _metadata.xlsx,
    // at minimum community knowledge is indexed.
    // Placed after a self-contained ingest try/catch so it always runs,
    // even when ingest_files throws (e.g. corrupt file).
    step_start = performance.now()
    await build_knowledge_databases()
    console.info(`⏱ build: ${((performance.now() - step_start) / 1000).toFixed(3)}s`)

    const duration_seconds = ((performance.now() - start_time) / 1000).toFixed(3)
    console.info(`✅ Pipeline completed in ${duration_seconds}s`)
  } catch (e) {
    console.error('❌ Pipeline execution failed', e)
  } finally {
    save_events(events)
  }
}
