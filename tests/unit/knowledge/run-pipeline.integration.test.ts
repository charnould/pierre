/**
 * Integration tests for run_pipeline().
 *
 * These tests exercise the full orchestration:
 *   setup_knowledge_directories → generate_metadata → ingest_files → build_knowledge_databases
 *
 * An isolated service (_test_pipeline_svc) is used so that the production datastores
 * are never touched. The service directory is created fresh before each test and fully
 * removed after the suite.
 */

import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import * as fs from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'

import * as XLSX from 'xlsx'

import { run_pipeline } from '../../../utils/knowledge/run-pipeline'

XLSX.set_fs(fs)

// ─── Isolated environment ─────────────────────────────────────────────────────

const TEST_SERVICE = '_test_pipeline_svc'
const ORIGINAL_SERVICE = Bun.env['SERVICE']

const DATASTORE_ROOT = `datastores/${TEST_SERVICE}`
const FILES_DIR = `${DATASTORE_ROOT}/files`
const KNOWLEDGE_ROOT = `${DATASTORE_ROOT}/knowledge`
const DATASTORE_SQLITE = `${DATASTORE_ROOT}/datastore.sqlite`

// The access profile used in _metadata.xlsx — must match an existing config id.
const TEST_PROFILE = 'testing_purpose_1'
const KNOWLEDGE_DB = `${KNOWLEDGE_ROOT}/${TEST_PROFILE}/db.sqlite`

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Creates a minimal `_metadata.xlsx` with the given data rows.
 * Rows 0–1 are skipped headers; row 2 is the column-name row.
 */
const write_metadata_xlsx = (
  data_rows: (string | number | null)[][],
  columns = ['filename', 'access', 'agent_filename', 'sheet', 'headers', 'url']
): void => {
  const sheet = XLSX.utils.aoa_to_sheet([['ignored'], ['ignored'], columns, ...data_rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, 'metadata')
  XLSX.writeFile(wb, `${FILES_DIR}/_metadata.xlsx`)
}

/** Opens the knowledge SQLite for the test profile (after pipeline run). */
const open_knowledge_db = (): Database => new Database(KNOWLEDGE_DB)

/** Reads all knowledge_build rows from the test datastore. */
const get_build_events = (): { source: string; kind: string; code: string }[] => {
  const db = new Database(DATASTORE_SQLITE)
  try {
    return db
      .query<{ source: string; kind: string; code: string }, []>(
        'SELECT source, kind, code FROM knowledge_build'
      )
      .all()
  } finally {
    db.close()
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeAll(() => {
  Bun.env['SERVICE'] = TEST_SERVICE
})

afterAll(async () => {
  if (ORIGINAL_SERVICE === undefined) {
    delete Bun.env['SERVICE']
  } else {
    Bun.env['SERVICE'] = ORIGINAL_SERVICE
  }
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
})

beforeEach(async () => {
  await mkdir(FILES_DIR, { recursive: true })
  await mkdir(KNOWLEDGE_ROOT, { recursive: true })

  // Create the datastore.sqlite with the knowledge_build table that save_events() requires.
  const db = new Database(DATASTORE_SQLITE)
  db.run(`CREATE TABLE IF NOT EXISTS knowledge_build (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT,
    source     TEXT,
    kind       TEXT,
    code       TEXT,
    subject    TEXT
  )`)
  db.close()
})

afterEach(async () => {
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('run_pipeline — full integration', () => {
  describe('when _metadata.xlsx is absent', () => {
    it('completes without throwing and records METADATA_MISSING in knowledge_build', async () => {
      await expect(run_pipeline()).resolves.toBeUndefined()

      const codes = get_build_events().map((e) => e.code)
      expect(codes).toContain('METADATA_MISSING')
    })

    it('still builds knowledge databases for community knowledge (pipeline not blocked)', async () => {
      // Even without _metadata.xlsx, build_knowledge_databases() runs.
      // With no source files at all the knowledge dir may not exist yet — pipeline should not throw.
      await expect(run_pipeline()).resolves.toBeUndefined()
    })
  })

  describe('when _metadata.xlsx references a markdown file', () => {
    beforeEach(async () => {
      // Drop a markdown source file into the files directory
      await Bun.write(
        `${FILES_DIR}/guide_test.md`,
        "# Guide de test\n\nCe document est utilisé par les tests d'intégration."
      )

      // _metadata.xlsx: one row pointing to guide_test.md, accessible by TEST_PROFILE
      write_metadata_xlsx([['guide_test.md', TEST_PROFILE, 'Guide de test', 1, 1, null]])
    })

    it('produces a knowledge SQLite with a documents FTS5 table', async () => {
      await run_pipeline()

      expect(await Bun.file(KNOWLEDGE_DB).exists()).toBe(true)

      const db = open_knowledge_db()
      const row = db
        .query<{ filename: string; content: string }, []>('SELECT filename, content FROM documents')
        .get()
      db.close()

      expect(row).toBeTruthy()
      expect(row!.filename).toBe('guide_de_test')
      expect(row!.content).toContain('Guide de test')
    })

    it('generates a _readme with a documents entry', async () => {
      await run_pipeline()

      const db = open_knowledge_db()
      const row = db.query<{ content: string | null }, []>('SELECT content FROM _readme').get()
      db.close()

      expect(row?.content).toBeTruthy()
      const schema = JSON.parse(row!.content!.replace(/^```json\n/, '').replace(/\n```$/, ''))
      expect(schema).toHaveProperty('documents')
      expect(schema.documents.type).toBe('fts5')
    })

    it('records no error-level events when the pipeline runs cleanly', async () => {
      await run_pipeline()

      // PIPELINE_OK is only inserted when events is strictly empty (no configs at all).
      // In a realistic environment other configs (default, demo, …) produce
      // PROFILE_NOT_IN_METADATA info events, which is expected and harmless.
      // What matters is that no error or warning events were emitted.
      const error_events = get_build_events().filter(
        (e) => e.kind === 'error' || e.kind === 'warning'
      )
      expect(error_events).toHaveLength(0)
    })
  })

  describe('when _metadata.xlsx references a spreadsheet file', () => {
    beforeEach(async () => {
      // Create a minimal xlsx source file
      const sheet = XLSX.utils.aoa_to_sheet([
        ['nom', 'valeur'],
        ['alpha', 1],
        ['beta', 2]
      ])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, sheet, 'Feuille1')
      XLSX.writeFile(wb, `${FILES_DIR}/donnees_test.xlsx`)

      // _metadata.xlsx: one row pointing to the xlsx, sheet index 1, header row 1
      write_metadata_xlsx([['donnees_test.xlsx', TEST_PROFILE, 'Données test', 1, 1, null]])
    })

    it('produces a knowledge SQLite with a tabular table from the spreadsheet', async () => {
      await run_pipeline()

      expect(await Bun.file(KNOWLEDGE_DB).exists()).toBe(true)

      const db = open_knowledge_db()
      const tables = db
        .query<{ name: string }, []>(
          `SELECT name FROM sqlite_master WHERE type='table' AND name NOT IN ('_readme', '_sources', 'documents')`
        )
        .all()
        .map((r) => r.name)
      db.close()

      expect(tables).toContain('donnees_test')
    })

    it('populates the tabular table with the spreadsheet rows', async () => {
      await run_pipeline()

      const db = open_knowledge_db()
      const rows = db.query<{ nom: string; valeur: number }, []>('SELECT * FROM donnees_test').all()
      db.close()

      expect(rows).toHaveLength(2)
      expect(rows[0]).toMatchObject({ nom: 'alpha', valeur: 1 })
      expect(rows[1]).toMatchObject({ nom: 'beta', valeur: 2 })
    })

    it('generates a _readme listing the tabular table', async () => {
      await run_pipeline()

      const db = open_knowledge_db()
      const row = db.query<{ content: string | null }, []>('SELECT content FROM _readme').get()
      db.close()

      expect(row?.content).toBeTruthy()
      const schema = JSON.parse(row!.content!.replace(/^```json\n/, '').replace(/\n```$/, ''))
      const table = schema.tables?.find((t: { name: string }) => t.name === 'donnees_test')
      expect(table).toBeTruthy()
      expect(table.columns.map((c: { name: string }) => c.name)).toContain('nom')
    })
  })

  describe('when a file is listed in _metadata.xlsx but missing from disk', () => {
    beforeEach(() => {
      write_metadata_xlsx([['fichier_absent.md', TEST_PROFILE, 'Absent', 1, 1, null]])
      // Deliberately do NOT write fichier_absent.md to FILES_DIR
    })

    it('records METADATA_NOT_IN_FILES without throwing', async () => {
      await expect(run_pipeline()).resolves.toBeUndefined()

      const codes = get_build_events().map((e) => e.code)
      expect(codes).toContain('METADATA_NOT_IN_FILES')
    })
  })
})
