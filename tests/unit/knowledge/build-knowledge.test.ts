import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdirSync } from 'node:fs'
import { rm } from 'node:fs/promises'

import { build_knowledge_databases } from '../../../utils/knowledge/build-knowledge'

// ─── Isolated test environment ────────────────────────────────────────────────
//
// We override Bun.env.SERVICE to '_test_knowledge_svc' so that
// build_knowledge_databases() only touches datastores/_test_knowledge_svc/
// and never interferes with production databases.

const TEST_SERVICE = '_test_knowledge_svc'
const ORIGINAL_SERVICE = Bun.env['SERVICE']
const KNOWLEDGE_ROOT = `datastores/${TEST_SERVICE}/knowledge`
const CONFIG_ID = 'cfg'
const SOURCE_DIR = `${KNOWLEDGE_ROOT}/${CONFIG_ID}`
const DB_PATH = `${SOURCE_DIR}/db.sqlite`

// ─── Helpers ─────────────────────────────────────────────────────────────────

const write_json = (filename: string, rows: object[]) =>
  Bun.write(`${SOURCE_DIR}/${filename}`, JSON.stringify(rows))

const write_md = async (rel_path: string, content: string) => {
  const full_path = `${SOURCE_DIR}/${rel_path}`
  const dir = full_path.split('/').slice(0, -1).join('/')
  mkdirSync(dir, { recursive: true })
  await Bun.write(full_path, content)
}

const open_db = () => new Database(DB_PATH)

// ─── Lifecycle ───────────────────────────────────────────────────────────────

beforeAll(() => {
  Bun.env['SERVICE'] = TEST_SERVICE
})

afterAll(async () => {
  if (ORIGINAL_SERVICE === undefined) {
    delete Bun.env['SERVICE']
  } else {
    Bun.env['SERVICE'] = ORIGINAL_SERVICE
  }
  await rm(`datastores/${TEST_SERVICE}`, { recursive: true, force: true })
})

beforeEach(() => {
  mkdirSync(SOURCE_DIR, { recursive: true })
})

afterEach(async () => {
  await rm(`datastores/${TEST_SERVICE}`, { recursive: true, force: true })
  mkdirSync(KNOWLEDGE_ROOT, { recursive: true })
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('build_knowledge_databases', () => {
  describe('when no config directories exist', () => {
    it('skips without throwing', async () => {
      await rm(`datastores/${TEST_SERVICE}`, { recursive: true, force: true })
      mkdirSync(KNOWLEDGE_ROOT, { recursive: true })
      await expect(build_knowledge_databases()).resolves.toBeUndefined()
    })
  })

  describe('JSON files → SQLite tables', () => {
    it('creates a table with correct columns and rows', async () => {
      await write_json('communes.json', [
        { nom: 'Paris', code: '75056' },
        { nom: 'Lyon', code: '69123' }
      ])

      await build_knowledge_databases()

      const db = open_db()
      const rows = db.query<{ nom: string; code: string }, []>('SELECT * FROM communes').all()
      db.close()

      expect(rows).toHaveLength(2)
      expect(rows[0]).toMatchObject({ nom: 'Paris', code: '75056' })
      expect(rows[1]).toMatchObject({ nom: 'Lyon', code: '69123' })
    })

    it('sanitizes column names (accents, spaces → snake_case)', async () => {
      await write_json('data.json', [{ 'Nom complet': 'Alice', Âge: '30' }])

      await build_knowledge_databases()

      const db = open_db()
      const rows = db.query<Record<string, string>, []>('SELECT * FROM data').all()
      db.close()

      expect(rows[0]).toHaveProperty('nom_complet', 'Alice')
      expect(rows[0]).toHaveProperty('age', '30')
    })

    it('uses all JSON object keys, not only keys from the first row', async () => {
      await write_json('items.json', [{ first: 'A' }, { second: 'B' }])

      await build_knowledge_databases()

      const db = open_db()
      const cols = db
        .query<{ name: string }, []>('PRAGMA table_info("items")')
        .all()
        .map((r) => r.name)
      db.close()

      expect(cols).toEqual(['first', 'second'])
    })

    it('deduplicates sanitized column names', async () => {
      await write_json('items.json', [{ 'Nom complet': 'Alice', nom_complet: 'Bob' }])

      await build_knowledge_databases()

      const db = open_db()
      const cols = db
        .query<{ name: string }, []>('PRAGMA table_info("items")')
        .all()
        .map((r) => r.name)
      db.close()

      expect(cols).toEqual(['nom_complet', 'nom_complet_2'])
    })

    it('skips columns whose key starts with __empty', async () => {
      await write_json('items.json', [{ name: 'X', __empty1: 'ignored' }])

      await build_knowledge_databases()

      const db = open_db()
      const cols = db
        .query<{ name: string }, []>('PRAGMA table_info("items")')
        .all()
        .map((r) => r.name)
      db.close()

      expect(cols).toContain('name')
      expect(cols.some((c) => c.includes('empty'))).toBe(false)
    })
  })

  describe('Markdown files → FTS5 documents table', () => {
    it('inserts markdown files with correct filename and content', async () => {
      await write_md('guide.md', '# Guide\nContenu du guide.')

      await build_knowledge_databases()

      const db = open_db()
      const row = db
        .query<{ filename: string; content: string }, []>('SELECT filename, content FROM documents')
        .get()
      db.close()

      expect(row?.filename).toBe('guide')
      expect(row?.content).toContain('Guide')
    })

    it('sets source to "client" for files outside donnees_universelles/', async () => {
      await write_md('faq.md', '# FAQ')

      await build_knowledge_databases()

      const db = open_db()
      const row = db
        .query<{ source: string }, [string]>('SELECT source FROM documents WHERE filename = ?')
        .get('faq')
      db.close()

      expect(row?.source).toBe('client')
    })

    it('sets source to "community" for files inside donnees_universelles/', async () => {
      await write_md('donnees_universelles/connaissances_generales/logement.md', '# Logement')

      await build_knowledge_databases()

      const db = open_db()
      const row = db
        .query<{ filename: string; source: string }, [string]>(
          'SELECT filename, source FROM documents WHERE filename = ?'
        )
        .get('logement')
      db.close()

      expect(row?.source).toBe('community')
      expect(row?.filename).toBe('logement')
    })
  })

  describe('YAML frontmatter in Markdown files', () => {
    it('extracts url from frontmatter and strips frontmatter from content', async () => {
      await write_md(
        'guide.md',
        '---\nurl: https://example.com/guide.pdf\n---\n\n# Guide\nContenu.'
      )

      await build_knowledge_databases()

      const db = open_db()
      const row = db
        .query<{ content: string; url: string }, [string]>(
          'SELECT content, url FROM documents WHERE filename = ?'
        )
        .get('guide')
      db.close()

      expect(row?.url).toBe('https://example.com/guide.pdf')
      expect(row?.content).not.toContain('---')
      expect(row?.content).not.toContain('url:')
      expect(row?.content).toContain('Guide')
    })

    it('stores null url when no frontmatter is present', async () => {
      await write_md('plain.md', '# Plain\nNo frontmatter here.')

      await build_knowledge_databases()

      const db = open_db()
      const row = db
        .query<{ url: string | null }, [string]>('SELECT url FROM documents WHERE filename = ?')
        .get('plain')
      db.close()

      expect(row?.url).toBeNull()
    })
  })

  describe('_sources table', () => {
    it('creates _sources table from _sources.json', async () => {
      await Bun.write(
        `${SOURCE_DIR}/_sources.json`,
        JSON.stringify({ procedures: 'https://example.com/proc.xlsx' })
      )
      await write_json('procedures.json', [{ id: '1' }])

      await build_knowledge_databases()

      const db = open_db()
      const row = db
        .query<{ name: string; url: string }, [string]>(
          'SELECT name, url FROM _sources WHERE name = ?'
        )
        .get('procedures')
      db.close()

      expect(row?.name).toBe('procedures')
      expect(row?.url).toBe('https://example.com/proc.xlsx')
    })

    it('creates _sources table with null url when no URL is provided', async () => {
      await Bun.write(`${SOURCE_DIR}/_sources.json`, JSON.stringify({ ref: null }))
      await write_json('ref.json', [{ id: '1' }])

      await build_knowledge_databases()

      const db = open_db()
      const row = db
        .query<{ name: string; url: string | null }, [string]>(
          'SELECT name, url FROM _sources WHERE name = ?'
        )
        .get('ref')
      db.close()

      expect(row?.name).toBe('ref')
      expect(row?.url).toBeNull()
    })

    it('does not create _sources table when _sources.json is absent', async () => {
      await write_json('ref.json', [{ id: '1' }])

      await build_knowledge_databases()

      const db = open_db()
      const has_sources = db
        .query<{ n: number }, []>(
          `SELECT COUNT(*) as n FROM sqlite_master WHERE type='table' AND name='_sources'`
        )
        .get()!.n
      db.close()

      expect(has_sources).toBe(0)
    })

    it('_readme includes URL when _sources is present', async () => {
      await Bun.write(
        `${SOURCE_DIR}/_sources.json`,
        JSON.stringify({ planning: 'https://example.com/planning.xlsx' })
      )
      await write_json('planning.json', [{ id: '1' }])

      await build_knowledge_databases()

      const db = open_db()
      const row = db.query<{ content: string }, []>('SELECT content FROM _readme').get()
      db.close()

      expect(row?.content).toContain('https://example.com/planning.xlsx')
    })
  })

  describe('_readme table', () => {
    it('generates a non-empty schema description', async () => {
      await write_json('ref.json', [{ id: '1', label: 'Test' }])

      await build_knowledge_databases()

      const db = open_db()
      const row = db.query<{ content: string }, []>('SELECT content FROM _readme').get()
      db.close()

      expect(row?.content).toBeTruthy()
      expect(row?.content).toContain('ref')
    })
  })

  describe('cleanup after build', () => {
    it('deletes source JSON and MD files', async () => {
      await write_json('data.json', [{ id: '1' }])
      await write_md('doc.md', '# Doc')

      await build_knowledge_databases()

      expect(await Bun.file(`${SOURCE_DIR}/data.json`).exists()).toBe(false)
      expect(await Bun.file(`${SOURCE_DIR}/doc.md`).exists()).toBe(false)
    })

    it('deletes the donnees_universelles/ directory', async () => {
      await write_md('donnees_universelles/connaissances_generales/theme.md', '# Theme')

      await build_knowledge_databases()

      const universal_dir = `${SOURCE_DIR}/donnees_universelles`
      expect(await Bun.file(universal_dir).exists()).toBe(false)
    })
  })
})
