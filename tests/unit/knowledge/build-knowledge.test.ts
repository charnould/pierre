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

const parse_readme = (content: string) =>
  JSON.parse(content.replace(/^```json\n/, '').replace(/\n```$/, ''))

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

    it('creates INTEGER columns for all-numeric columns and TEXT for mixed columns', async () => {
      await write_json('stats.json', [
        { label: 'Paris', population: 2161000, score: 9.5 },
        { label: 'Lyon', population: 515695, score: 8.1 }
      ])

      await build_knowledge_databases()

      const db = open_db()
      const col_info = db
        .query<{ name: string; type: string }, []>('PRAGMA table_info("stats")')
        .all()
      db.close()

      const type_of = Object.fromEntries(col_info.map((r) => [r.name, r.type]))
      expect(type_of['label']).toBe('TEXT')
      expect(type_of['population']).toBe('INTEGER')
      expect(type_of['score']).toBe('INTEGER')
    })

    it('stores numeric values as numbers (not strings) in INTEGER columns, including decimals', async () => {
      await write_json('measures.json', [
        { name: 'a', value: 42.5 },
        { name: 'b', value: 100 }
      ])

      await build_knowledge_databases()

      const db = open_db()
      const rows = db
        .query<{ name: string; value: number }, []>('SELECT name, value FROM measures')
        .all()
      db.close()

      expect(typeof rows[0]!.value).toBe('number')
      expect(rows[0]!.value).toBe(42.5)
      expect(rows[1]!.value).toBe(100)
    })

    it('keeps INTEGER type when a numeric column has at least one null', async () => {
      await write_json('partial.json', [
        { name: 'a', value: 42 },
        { name: 'b', value: null }
      ])

      await build_knowledge_databases()

      const db = open_db()
      const col_info = db
        .query<{ name: string; type: string }, []>('PRAGMA table_info("partial")')
        .all()
      db.close()

      const type_of = Object.fromEntries(col_info.map((r) => [r.name, r.type]))
      // null rows are excluded from the check, so 'value' is still fully numeric → INTEGER
      expect(type_of['value']).toBe('INTEGER')
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

      const schema = parse_readme(row!.content)
      const table = schema.tables.find((t: { name: string }) => t.name === 'planning')
      expect(table?.source_url).toBe('https://example.com/planning.xlsx')
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
      const schema = parse_readme(row!.content)
      expect(schema.tables.some((t: { name: string }) => t.name === 'ref')).toBe(true)
    })

    it('marks a TEXT column with ≤ 20 distinct values as discrete and lists values', async () => {
      await write_json('ref.json', [
        { status: 'actif' },
        { status: 'inactif' },
        { status: 'actif' }
      ])

      await build_knowledge_databases()

      const db = open_db()
      const row = db.query<{ content: string }, []>('SELECT content FROM _readme').get()
      db.close()

      const schema = parse_readme(row!.content)
      const table = schema.tables.find((t: { name: string }) => t.name === 'ref')
      const col = table?.columns.find((c: { name: string }) => c.name === 'status')
      expect(col?.nature).toBe('discrete')
      expect(col?.values).toContain('actif')
      expect(col?.values).toContain('inactif')
    })

    it('marks an INTEGER column with > 20 distinct values as continuous and shows min→max range', async () => {
      const rows = Array.from({ length: 25 }, (_, i) => ({ score: i + 1 }))
      await write_json('measures.json', rows)

      await build_knowledge_databases()

      const db = open_db()
      const row = db.query<{ content: string }, []>('SELECT content FROM _readme').get()
      db.close()

      const schema = parse_readme(row!.content)
      const table = schema.tables.find((t: { name: string }) => t.name === 'measures')
      const col = table?.columns.find((c: { name: string }) => c.name === 'score')
      expect(col?.nature).toBe('continuous_numeric')
      expect(col?.min).toBe(1)
      expect(col?.max).toBe(25)
    })

    it('marks a TEXT column with > 20 distinct values as continuous text libre', async () => {
      const rows = Array.from({ length: 25 }, (_, i) => ({ label: `label_${i}` }))
      await write_json('labels.json', rows)

      await build_knowledge_databases()

      const db = open_db()
      const row = db.query<{ content: string }, []>('SELECT content FROM _readme').get()
      db.close()

      const schema = parse_readme(row!.content)
      const table = schema.tables.find((t: { name: string }) => t.name === 'labels')
      const col = table?.columns.find((c: { name: string }) => c.name === 'label')
      expect(col?.nature).toBe('continuous_text')
    })
  })

  describe('JSON edge cases (skipped files)', () => {
    it('skips a JSON file that is not an array', async () => {
      await Bun.write(`${SOURCE_DIR}/not_array.json`, JSON.stringify({ key: 'value' }))

      await build_knowledge_databases()

      const db = open_db()
      const has_table =
        db
          .query<{ n: number }, []>(
            `SELECT COUNT(*) as n FROM sqlite_master WHERE type='table' AND name='not_array'`
          )
          .get()!.n > 0
      db.close()

      expect(has_table).toBe(false)
    })

    it('skips a JSON file that is an empty array', async () => {
      await Bun.write(`${SOURCE_DIR}/empty.json`, JSON.stringify([]))

      await build_knowledge_databases()

      const db = open_db()
      const has_table =
        db
          .query<{ n: number }, []>(
            `SELECT COUNT(*) as n FROM sqlite_master WHERE type='table' AND name='empty'`
          )
          .get()!.n > 0
      db.close()

      expect(has_table).toBe(false)
    })

    it('skips a JSON array whose items are all non-objects', async () => {
      await Bun.write(`${SOURCE_DIR}/strings.json`, JSON.stringify(['alpha', 'beta', null, 42]))

      await build_knowledge_databases()

      const db = open_db()
      const has_table =
        db
          .query<{ n: number }, []>(
            `SELECT COUNT(*) as n FROM sqlite_master WHERE type='table' AND name='strings'`
          )
          .get()!.n > 0
      db.close()

      expect(has_table).toBe(false)
    })
  })

  describe('_readme when database is empty', () => {
    it('stores null in _readme when there are no tables and no markdown documents', async () => {
      // No JSON and no MD files → empty db
      await build_knowledge_databases()

      const db = open_db()
      const row = db.query<{ content: string | null }, []>('SELECT content FROM _readme').get()
      db.close()

      expect(row?.content).toBeNull()
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
