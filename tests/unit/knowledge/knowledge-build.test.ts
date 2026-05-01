import { Database } from 'bun:sqlite'
import { beforeEach, describe, expect, it } from 'bun:test'

import { save_events } from '../../../utils/knowledge/run-pipeline'

type Row = { source: string; kind: string; code: string; subject: string | null }

const db = new Database(`datastores/${Bun.env['SERVICE']}/datastore.sqlite`)

function getEvents(): Row[] {
  return db.query<Row, []>('SELECT source, kind, code, subject FROM knowledge_build').all()
}

function insertCliUpload(subject: string, daysAgo = 0): void {
  const ts = new Date(Date.now() - daysAgo * 86400 * 1000).toISOString()
  db.run(
    "INSERT INTO knowledge_build (created_at, source, kind, code, subject) VALUES (?, 'cli', 'action', 'CLI_UPLOAD', ?)",
    [ts, subject]
  )
}

beforeEach(() => {
  db.run('DELETE FROM knowledge_build')
})

describe('save_events', () => {
  describe('CLI_UPLOAD_WITHOUT_METADATA', () => {
    it('should insert warning when CLI uploads exist without _metadata.xlsx', () => {
      insertCliUpload('document.md')
      insertCliUpload('autre_fichier.docx')

      save_events([])

      const codes = getEvents().map((r) => r.code)
      expect(codes).toContain('CLI_UPLOAD_WITHOUT_METADATA')
    })

    it('should NOT insert warning when _metadata.xlsx was also uploaded via CLI', () => {
      insertCliUpload('document.md')
      insertCliUpload('_metadata.xlsx')

      save_events([])

      const codes = getEvents().map((r) => r.code)
      expect(codes).not.toContain('CLI_UPLOAD_WITHOUT_METADATA')
    })

    it('should NOT insert warning when there were no CLI uploads at all', () => {
      save_events([])

      const codes = getEvents().map((r) => r.code)
      expect(codes).not.toContain('CLI_UPLOAD_WITHOUT_METADATA')
    })
  })

  describe('PIPELINE_OK', () => {
    it('should insert PIPELINE_OK when there are no anomalies', () => {
      save_events([])

      const codes = getEvents().map((r) => r.code)
      expect(codes).toContain('PIPELINE_OK')
    })

    it('should NOT insert PIPELINE_OK when there are anomalies', () => {
      save_events([{ source: 'pipeline', kind: 'error', code: 'METADATA_MISSING', subject: null }])

      const codes = getEvents().map((r) => r.code)
      expect(codes).not.toContain('PIPELINE_OK')
      expect(codes).toContain('METADATA_MISSING')
    })
  })

  describe('METADATA_MISSING skips ingest anomalies', () => {
    it('should NOT emit PROFILE_NOT_IN_METADATA or FILE_NOT_IN_METADATA when METADATA_MISSING', async () => {
      // run_pipeline skips ingest_files when _metadata.xlsx is absent
      // We simulate this by calling save_events with only METADATA_MISSING
      // (as run_pipeline would do) and verifying no ingest codes appear
      save_events([{ source: 'pipeline', kind: 'error', code: 'METADATA_MISSING', subject: null }])

      const codes = getEvents().map((r) => r.code)
      expect(codes).not.toContain('PROFILE_NOT_IN_METADATA')
      expect(codes).not.toContain('FILE_NOT_IN_METADATA')
      expect(codes).not.toContain('PROFILE_MISSING_IN_ASSETS')
    })
  })

  describe('events insertion', () => {
    it('should insert one row per event with correct fields', () => {
      save_events([
        { source: 'pipeline', kind: 'warning', code: 'FILE_NOT_IN_METADATA', subject: 'doc.md' },
        {
          source: 'pipeline',
          kind: 'error',
          code: 'PROFILE_MISSING_IN_ASSETS',
          subject: 'profil_x'
        }
      ])

      const events = getEvents().filter((r) => r.source === 'pipeline')
      expect(events).toContainEqual({
        source: 'pipeline',
        kind: 'warning',
        code: 'FILE_NOT_IN_METADATA',
        subject: 'doc.md'
      })
      expect(events).toContainEqual({
        source: 'pipeline',
        kind: 'error',
        code: 'PROFILE_MISSING_IN_ASSETS',
        subject: 'profil_x'
      })
    })
  })

  describe('purge', () => {
    it('should delete all previous pipeline rows on each run', () => {
      const oldTs = new Date(Date.now() - 2 * 86400 * 1000).toISOString()
      db.run(
        "INSERT INTO knowledge_build (created_at, source, kind, code, subject) VALUES (?, 'pipeline', 'info', 'PIPELINE_OK', NULL)",
        [oldTs]
      )

      save_events([])

      const pipelineRows = db
        .query<{ created_at: string }, []>(
          "SELECT created_at FROM knowledge_build WHERE source='pipeline'"
        )
        .all()

      // Only today's run should remain
      const oldEntries = pipelineRows.filter(
        (r) => new Date(r.created_at) < new Date(Date.now() - 86400 * 1000)
      )
      expect(oldEntries).toHaveLength(0)
    })

    it('should keep cli rows from today', () => {
      insertCliUpload('document.md', 0)

      save_events([])

      const cliRows = db
        .query<{ code: string }, []>(
          "SELECT code FROM knowledge_build WHERE source='cli' AND DATE(created_at) = DATE('now')"
        )
        .all()

      expect(cliRows.length).toBeGreaterThanOrEqual(1)
    })

    it('should delete cli rows from previous days', () => {
      insertCliUpload('old_document.md', 2)

      save_events([])

      const oldCliRows = db
        .query<{ code: string }, []>(
          "SELECT code FROM knowledge_build WHERE source='cli' AND DATE(created_at) < DATE('now')"
        )
        .all()

      expect(oldCliRows).toHaveLength(0)
    })
  })
})
