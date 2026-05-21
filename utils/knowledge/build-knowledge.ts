import { Database } from 'bun:sqlite'
import { existsSync, readdirSync } from 'node:fs'
import { rm, readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'

import { normalize_knowledge_name } from './utils'

// ─── Types ────────────────────────────────────────────────────────────────────

/** A row returned by `sqlite_master` or `PRAGMA table_list` queries. */
type TableRow = { name: string }

/** A row returned by `PRAGMA table_info(…)`. */
type ColRow = { name: string; type: string; notnull: number }

/** Description of a single column for schema documentation. */
type ColDescription =
  | { col: string; sql_type: string; not_null: boolean; nature: 'discrete'; values: string[] }
  | {
      col: string
      sql_type: string
      not_null: boolean
      nature: 'continuous_numeric'
      min: number
      max: number
    }
  | { col: string; sql_type: string; not_null: boolean; nature: 'continuous_text' }
  | { col: string; sql_type: string; not_null: boolean; nature: 'date'; min: string; max: string }

/** A single JSON object row eligible for tabular import. */
type JsonRow = Record<string, unknown>

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns a non-empty, unique SQLite identifier for each input key.
 *
 * @param keys - Raw JSON object keys.
 * @returns SQLite-safe column names aligned with `keys`.
 */
const build_unique_sql_identifiers = (keys: string[]): string[] => {
  const seen = new Map<string, number>()

  return keys.map((key) => {
    const base_identifier = normalize_knowledge_name(key) || 'column'
    const occurrence = seen.get(base_identifier) ?? 0
    seen.set(base_identifier, occurrence + 1)

    if (occurrence === 0) return base_identifier

    const suffix = `_${occurrence + 1}`
    return `${base_identifier}${suffix}`
  })
}

/**
 * Checks whether a parsed JSON value is an object row suitable for tabular import.
 *
 * @param value - Parsed JSON array item.
 * @returns `true` when `value` is a non-null, non-array plain object.
 */
const is_json_row = (value: unknown): value is JsonRow =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Returns all files with the given extension under `dir` (recursive).
 *
 * @param dir - Root directory to walk.
 * @param ext - File extension to match (e.g. `'.json'`).
 * @returns Absolute paths of all matching files.
 */
const walk_files = (dir: string, ext: string): string[] =>
  (readdirSync(dir, { recursive: true }) as string[])
    .filter((f) => f.endsWith(ext))
    .map((f) => join(dir, f))

/**
 * Analyzes each column of a table and returns a description of its nature.
 *
 * - ≤ 20 distinct non-null values → **discrete** (values listed)
 * - > 20 distinct values + INTEGER type → **continuous_numeric** (min/max range)
 * - > 20 distinct values + TEXT type → **continuous_text**
 *
 * @param db - Open SQLite database instance.
 * @param table - Table name to analyze.
 * @returns Array of column descriptions.
 */
const DISCRETE_THRESHOLD = 20

const describe_columns = (db: Database, table: string): ColDescription[] => {
  const cols = db.query<ColRow, []>(`PRAGMA table_info("${table}")`).all()

  return cols.map(({ name, type, notnull }) => {
    const not_null = notnull === 1
    const { dc } = db
      .query<{ dc: number }, []>(`SELECT COUNT(DISTINCT "${name}") AS dc FROM "${table}"`)
      .get()!

    if (dc <= DISCRETE_THRESHOLD) {
      const values = db
        .query<{ v: string | number | null }, []>(
          `SELECT DISTINCT "${name}" AS v FROM "${table}" WHERE "${name}" IS NOT NULL ORDER BY "${name}"`
        )
        .all()
        .map((r) => String(r.v))
      return { col: name, sql_type: type, not_null, nature: 'discrete', values }
    }

    if (type === 'INTEGER' || type === 'REAL') {
      const { min, max } = db
        .query<{ min: number; max: number }, []>(
          `SELECT MIN("${name}") AS min, MAX("${name}") AS max FROM "${table}"`
        )
        .get()!
      return { col: name, sql_type: type, not_null, nature: 'continuous_numeric', min, max }
    }

    if (type === 'TEXT') {
      const { non_null_count } = db
        .query<{ non_null_count: number }, []>(
          `SELECT COUNT("${name}") AS non_null_count FROM "${table}" WHERE "${name}" IS NOT NULL`
        )
        .get()!
      if (non_null_count > 0) {
        const { date_count } = db
          .query<{ date_count: number }, []>(
            `SELECT COUNT("${name}") AS date_count FROM "${table}"
             WHERE "${name}" IS NOT NULL AND "${name}" GLOB '????-??-??' AND length("${name}") = 10`
          )
          .get()!
        if (date_count === non_null_count) {
          const { min, max } = db
            .query<{ min: string; max: string }, []>(
              `SELECT MIN("${name}") AS min, MAX("${name}") AS max FROM "${table}"`
            )
            .get()!
          return { col: name, sql_type: type, not_null, nature: 'date', min, max }
        }
      }
    }

    return { col: name, sql_type: type, not_null, nature: 'continuous_text' }
  })
}

/**
 * Builds a minified JSON schema description of all tables in the database and
 * stores it in the `_readme` table.
 *
 * @param db - Open SQLite database instance.
 * @returns Minified JSON string, or `null` if the database contains no tables and no documents.
 */
const build_readme = (db: Database): string | null => {
  const tables = db
    .query<TableRow, []>(
      `SELECT name FROM sqlite_master WHERE type='table'
       AND name NOT LIKE '%_config' AND name NOT LIKE '%_content'
       AND name NOT LIKE '%_data' AND name NOT LIKE '%_docsize' AND name NOT LIKE '%_idx'
       AND name NOT IN ('_readme', '_sources', 'documents')
       ORDER BY name`
    )
    .all()

  const doc_count = db.query<{ n: number }, []>(`SELECT COUNT(*) as n FROM documents`).get()!.n

  if (tables.length === 0 && doc_count === 0) return null

  // Build URL lookup from _sources table if it exists
  const has_sources =
    db
      .query<{ n: number }, []>(
        `SELECT COUNT(*) as n FROM sqlite_master WHERE type='table' AND name='_sources'`
      )
      .get()!.n > 0

  const url_by_name = new Map<string, string>()
  if (has_sources) {
    const rows = db.query<{ name: string; url: string }, []>('SELECT name, url FROM _sources').all()
    for (const r of rows) if (r.url) url_by_name.set(r.name, r.url)
  }

  const schema: Record<string, unknown> = { access: 'read-only' }

  schema['tables'] = tables.map(({ name }) => {
    const rows = db.query<{ n: number }, []>(`SELECT COUNT(*) as n FROM "${name}"`).get()!.n
    const source_url = url_by_name.get(name) ?? null

    const columns = describe_columns(db, name).map((desc) => {
      const base = {
        name: desc.col,
        type: desc.sql_type,
        not_null: desc.not_null,
        nature: desc.nature
      }
      if (desc.nature === 'discrete') return { ...base, values: desc.values }
      if (desc.nature === 'continuous_numeric') return { ...base, min: desc.min, max: desc.max }
      if (desc.nature === 'date') return { ...base, min: desc.min, max: desc.max }
      return base
    })

    return { name, rows, source_url, columns }
  })

  if (doc_count > 0) {
    schema['documents'] = {
      type: 'fts5',
      columns: ['rowid', 'content', 'filename', 'url']
    }
  }

  return `\`\`\`json\n${JSON.stringify(schema)}\n\`\`\``
}

/**
 * Builds a SQLite database for a single config from its JSON and Markdown source files.
 *
 * - JSON files → one table each (columns sanitized to valid SQLite identifiers)
 * - Markdown files → FTS5 `documents` table with `content`
 * - Auto-generated schema description → `_readme` table
 * - Source files are deleted after ingestion; `donnees_universelles/` dir is removed
 *
 * @param config_id - Config directory name (e.g. `'default'`).
 * @param service - Service name (e.g. `'pierre-production'`).
 */
const build_database_for_config = async (config_id: string, service: string): Promise<void> => {
  const source_dir = `datastores/${service}/knowledge/${config_id}`
  const db_path = `datastores/${service}/knowledge/${config_id}/db.sqlite`

  if (!existsSync(source_dir)) {
    console.info(`⏭️  ${config_id}: no source directory — skipping`)
    return
  }

  const json_files = walk_files(source_dir, '.json')
  let md_files: string[] = []
  const db = new Database(db_path)

  try {
    // ── JSON files → one table each ─────────────────────────────────────────────

    for (const file_path of json_files) {
      const parsed_json = (await Bun.file(file_path).json()) as unknown
      if (!Array.isArray(parsed_json) || parsed_json.length === 0) continue

      const rows = parsed_json.filter(is_json_row)
      if (rows.length === 0) continue

      const all_keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
      const keys = all_keys.filter((k) => !k.startsWith('__empty'))
      if (keys.length === 0) continue

      const table_name = normalize_knowledge_name(basename(file_path, '.json')) || 'data'
      const sanitized_keys = build_unique_sql_identifiers(keys)

      // Infer SQLite column type: use INTEGER when every non-null value is a JS number.
      // SQLite's loose type affinity stores decimals correctly even in INTEGER columns.
      const col_types = keys.map((k) => {
        const non_null = rows.map((r) => r[k]).filter((v) => v !== null && v !== undefined)
        return non_null.length > 0 && non_null.every((v) => typeof v === 'number')
          ? 'INTEGER'
          : 'TEXT'
      })

      const col_defs = sanitized_keys.map((k, i) => `"${k}" ${col_types[i]}`).join(', ')

      db.run(`DROP TABLE IF EXISTS "${table_name}"`)
      db.run(`CREATE TABLE "${table_name}" (${col_defs})`)

      const placeholders = sanitized_keys.map(() => '?').join(', ')
      const stmt = db.prepare(
        `INSERT INTO "${table_name}" (${sanitized_keys.map((k) => `"${k}"`).join(', ')}) VALUES (${placeholders})`
      )

      db.transaction(() => {
        for (const row of rows) {
          const values = keys.map((k) => {
            const v = row[k]
            if (v === null || v === undefined) return null
            if (typeof v === 'number') return v
            return String(v)
          })
          stmt.run(...values)
        }
      })()
    }

    // ── Markdown files → FTS5 documents table ───────────────────────────────────

    db.run('DROP TABLE IF EXISTS documents')
    db.run(
      'CREATE VIRTUAL TABLE documents USING fts5(content, filename UNINDEXED, url UNINDEXED, tokenize = "unicode61 remove_diacritics 2 tokenchars \'-\'")'
    )

    md_files = walk_files(source_dir, '.md')
    const insert_doc = db.prepare('INSERT INTO documents (content, filename, url) VALUES (?, ?, ?)')

    for (const file_path of md_files) {
      const raw = await Bun.file(file_path).text()

      // Parse optional YAML frontmatter (---\nkey: value\n---\n)
      let content = raw
      let url: string | null = null
      const fm_match = raw.match(/^---\n([\s\S]*?)\n---\n+/)
      if (fm_match) {
        const frontmatter = fm_match[1] ?? ''
        const url_match = frontmatter.match(/^url:\s*(.+)$/m)
        if (url_match?.[1]) url = url_match[1].trim()
        content = raw.slice(fm_match[0].length)
      }

      const filename = basename(file_path, '.md')
      insert_doc.run(content, filename, url)
    }

    // ── _sources table from _sources.json (JSON table URLs) ─────────────────────

    db.run('DROP TABLE IF EXISTS _sources')
    const sources_path = join(source_dir, '_sources.json')
    if (existsSync(sources_path)) {
      const sources = (await Bun.file(sources_path).json()) as Record<string, string | null>
      db.run('CREATE TABLE _sources (name TEXT PRIMARY KEY, url TEXT)')
      const insert_source = db.prepare('INSERT INTO _sources (name, url) VALUES (?, ?)')
      db.transaction(() => {
        for (const [name, url] of Object.entries(sources)) insert_source.run(name, url)
      })()
    }

    // ── Auto-generate schema and store in _readme ────────────────────────────────

    db.run('DROP TABLE IF EXISTS _readme')
    db.run('CREATE TABLE _readme (content TEXT)')
    const raw_readme = build_readme(db)
    db.prepare('INSERT INTO _readme (content) VALUES (?)').run(raw_readme)
  } finally {
    db.close()
  }

  console.info(
    `✅ ${config_id}: ${json_files.length} JSON files → tables, ${md_files.length} MD files → FTS5, schema → _readme`
  )

  // ── Delete all source files and subdirectories, keep only db.sqlite ──────────

  const all_entries = await readdir(source_dir, { withFileTypes: true })
  await Promise.all(
    all_entries
      .filter((e) => e.name !== 'db.sqlite')
      .map((e) =>
        e.isDirectory()
          ? rm(join(source_dir, e.name), { recursive: true, force: true })
          : rm(join(source_dir, e.name), { force: true })
      )
  )
}

/**
 * Builds a SQLite knowledge database for every config directory found under
 * `datastores/${SERVICE}/knowledge/`.
 *
 * Config directories are processed in parallel.
 *
 * @throws {Error} When the `SERVICE` environment variable is not set.
 */
export const build_knowledge_databases = async (): Promise<void> => {
  const service = Bun.env['SERVICE']
  if (!service) throw new Error('SERVICE env var is required')

  const knowledge_dir = `datastores/${service}/knowledge`

  if (!existsSync(knowledge_dir)) {
    console.info('⏭️  No knowledge directory — skipping DB build')
    return
  }

  const entries = await readdir(knowledge_dir, { withFileTypes: true })
  const config_dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name)

  if (config_dirs.length === 0) {
    console.info('⏭️  No profile directories found — skipping DB build')
    return
  }

  await Promise.all(config_dirs.map((id) => build_database_for_config(id, service)))

  console.info('✅ All knowledge databases built')
}

// ── CLI entry point ──────────────────────────────────────────────────────────

if (import.meta.main) {
  await build_knowledge_databases()
}
