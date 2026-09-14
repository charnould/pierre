import { Database } from 'bun:sqlite'
import { existsSync, readdirSync } from 'node:fs'
import { rm, readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'

import { normalize_knowledge_name } from '../../../shared/knowledge'
import { insert_contacts_from_rows } from '../contacts'
import { ensure_datastore_ledger_indexes } from '../datastore-indexes'
import { migrate_datastore } from '../datastore-migrations'
import { DATASTORE_TABLES } from '../datastore-tables'
import { datastorePaths } from '../paths'
import { is_knowledge_pii_column, strip_pii_from_rows } from '../pii-columns'
import {
  COMMUNES_PAR_CODE_POSTAL_TABLE,
  import_communes_par_code_postal_table,
  is_code_postal_column
} from './codes-postaux'
import { import_json_rows, type JsonRow } from './sqlite-table-import'

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
  | {
      col: string
      sql_type: string
      not_null: boolean
      nature: 'date'
      format: 'ISO-8601'
      min: string
      max: string
    }

export type KnowledgeBuildArtifacts = {
  databases: Array<{ profileId: string; path: string }>
  mirrorTables: Map<string, { columns: string[]; rows: JsonRow[] }>
  contactRows: JsonRow[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
          return {
            col: name,
            sql_type: type,
            not_null,
            nature: 'date',
            format: 'ISO-8601',
            min,
            max
          }
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

  const schema: Record<string, unknown> = { access: 'read-only' }

  schema['tables'] = tables.map(({ name }) => {
    const rows = db.query<{ n: number }, []>(`SELECT COUNT(*) as n FROM "${name}"`).get()!.n

    if (name === COMMUNES_PAR_CODE_POSTAL_TABLE) {
      return {
        name,
        description:
          'Référentiel géographique français. Un code postal peut correspondre à plusieurs communes.',
        rows,
        columns: [
          { name: 'code_postal', type: 'TEXT', not_null: true, indexed: true },
          { name: 'code_insee', type: 'TEXT', not_null: true },
          { name: 'nom_commune', type: 'TEXT', not_null: true },
          { name: 'nom_epci', type: 'TEXT', not_null: false },
          { name: 'nom_departement', type: 'TEXT', not_null: true },
          { name: 'code_departement', type: 'TEXT', not_null: true },
          { name: 'nom_region', type: 'TEXT', not_null: true },
          { name: 'zonage_abc', type: 'TEXT', not_null: false },
          { name: 'zonage_123', type: 'TEXT', not_null: false }
        ]
      }
    }

    const columns = describe_columns(db, name).map((desc) => {
      const base = {
        name: desc.col,
        type: desc.sql_type,
        not_null: desc.not_null,
        nature: desc.nature
      }
      if (desc.nature === 'discrete') {
        const discrete_count = desc.values.length
        const has_long_value = desc.values.some((v) => v.length > 40)
        return has_long_value
          ? { ...base, discrete_count }
          : { ...base, discrete_count, values: desc.values }
      }
      if (desc.nature === 'continuous_numeric') return { ...base, min: desc.min, max: desc.max }
      if (desc.nature === 'date') return { ...base, min: desc.min, max: desc.max }
      return base
    })

    return { name, rows, columns }
  })

  if (doc_count > 0) {
    ;(schema['tables'] as unknown[]).push({
      name: 'documents',
      description:
        'Documents applicable to the current context. Each record represents one complete document and is not chunked or split into partial content.',
      engine: 'fts5',
      tokenizer: "unicode61 remove_diacritics 2 tokenchars '-'",
      rows: doc_count,
      columns: [
        { name: 'rowid', indexed: true },
        { name: 'content', indexed: true },
        { name: 'filename', indexed: false },
        { name: 'url', indexed: false }
      ],
      query_examples: [
        "SELECT rowid, content, filename, url FROM documents WHERE documents MATCH 'chauffage';",
        "SELECT rowid, content, filename, snippet(documents, 0, '[', ']', '...', 20) FROM documents WHERE documents MATCH 'ascenseur';",
        'SELECT rowid, content, filename FROM documents WHERE documents MATCH \'"dégât des eaux" AND urgence\';'
      ]
    })
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
const build_database_for_config = async (
  config_id: string,
  knowledgeRoot: string
): Promise<KnowledgeBuildArtifacts> => {
  const source_dir = join(knowledgeRoot, config_id)
  const db_path = join(source_dir, 'db.sqlite')
  const artifacts: KnowledgeBuildArtifacts = {
    databases: [],
    mirrorTables: new Map(),
    contactRows: []
  }

  if (!existsSync(source_dir)) {
    console.info(`⏭️  ${config_id}: no source directory — skipping`)
    return artifacts
  }

  const json_files = walk_files(source_dir, '.json')
  let md_files: string[] = []
  const db = new Database(db_path)

  try {
    const coreDataPath = join(source_dir, '_core_data.json')
    const coreDataTables = new Set<string>(
      (await Bun.file(coreDataPath).exists())
        ? ((await Bun.file(coreDataPath).json()) as string[])
        : []
    )
    // ── JSON files → one table each ─────────────────────────────────────────────

    for (const file_path of json_files.filter((path) => path !== coreDataPath)) {
      const parsed_json = (await Bun.file(file_path).json()) as unknown
      const payload =
        is_json_row(parsed_json) &&
        Array.isArray(parsed_json['columns']) &&
        Array.isArray(parsed_json['rows'])
          ? {
              columns: parsed_json['columns'].filter(
                (column): column is string => typeof column === 'string'
              ),
              rows: parsed_json['rows'].filter(is_json_row)
            }
          : null
      if (!payload || payload.columns.length === 0) continue

      const table_name = normalize_knowledge_name(basename(file_path, '.json')) || 'data'

      artifacts.contactRows.push(...payload.rows)

      if (coreDataTables.has(table_name)) {
        artifacts.mirrorTables.set(table_name, payload)
      }

      await import_json_rows(db, table_name, strip_pii_from_rows(payload.rows), {
        columns: payload.columns.filter((column) => !is_knowledge_pii_column(column))
      })
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

    // ── Auto-generate schema and store in _readme ────────────────────────────────

    await import_communes_par_code_postal_table(db)

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
  artifacts.databases.push({ profileId: config_id, path: db_path })

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
  return artifacts
}

/**
 * Builds a SQLite knowledge database for every config directory found under
 * the current service's knowledge directory.
 *
 * Config directories are processed in parallel.
 */
export const build_knowledge_databases = async (
  knowledgeRoot = datastorePaths().knowledge
): Promise<KnowledgeBuildArtifacts> => {
  const empty: KnowledgeBuildArtifacts = {
    databases: [],
    mirrorTables: new Map(),
    contactRows: []
  }

  if (!existsSync(knowledgeRoot)) {
    console.info('⏭️  No knowledge directory — skipping DB build')
    return empty
  }

  const entries = await readdir(knowledgeRoot, { withFileTypes: true })
  const config_dirs = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort()

  if (config_dirs.length === 0) {
    console.info('⏭️  No profile directories found — skipping DB build')
    return empty
  }

  const results = await Promise.all(
    config_dirs.map((id) => build_database_for_config(id, knowledgeRoot))
  )
  for (const result of results) {
    empty.databases.push(...result.databases)
    empty.contactRows.push(...result.contactRows)
    for (const [table, rows] of result.mirrorTables) {
      if (!empty.mirrorTables.has(table)) empty.mirrorTables.set(table, rows)
    }
  }

  console.info('✅ All knowledge databases built')
  return empty
}

export const publishKnowledgeMirrors = async (
  artifacts: KnowledgeBuildArtifacts,
  service?: string,
  previouslyManaged: readonly string[] = []
): Promise<void> => {
  const paths = datastorePaths(service)
  await migrate_datastore(paths.database)
  const db = new Database(paths.database)
  try {
    const needsPostalReference = [...artifacts.mirrorTables.values()].some(({ rows }) =>
      rows.some((row) => Object.keys(row).some(is_code_postal_column))
    )
    if (needsPostalReference) await import_communes_par_code_postal_table(db)

    db.run('BEGIN IMMEDIATE')
    try {
      for (const table of DATASTORE_TABLES) {
        const payload = artifacts.mirrorTables.get(table)
        if (payload) {
          await import_json_rows(db, table, payload.rows, {
            columns: payload.columns,
            transaction: false,
            refreshPostalReference: false
          })
        } else if (previouslyManaged.includes(table)) {
          db.run(`DROP TABLE IF EXISTS "${table}"`)
        }
      }
      insert_contacts_from_rows(db, artifacts.contactRows)
      ensure_datastore_ledger_indexes(db)
      db.run('COMMIT')
    } catch (error) {
      db.run('ROLLBACK')
      throw error
    }
  } finally {
    db.close()
  }
}
