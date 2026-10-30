import { Database } from 'bun:sqlite'

import { HIERARCHY_CONVENTION, isHierarchyColumn } from '../../../shared/hierarchy'
import { openDatastore } from '../datastore-db'
import { ensure_datastore_ledger_indexes } from '../datastore-indexes'
import { DATASTORE_TABLES } from '../datastore-tables'
import {
  COMMUNES_PAR_CODE_POSTAL_TABLE,
  import_communes_par_code_postal_table
} from './codes-postaux'
import { type DataRow, import_rows } from './sqlite-table-import'

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
  | { col: string; sql_type: string; not_null: boolean; nature: 'hierarchy' }
  | {
      col: string
      sql_type: string
      not_null: boolean
      nature: 'date'
      format: 'ISO-8601'
      min: string
      max: string
    }

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
    if (isHierarchyColumn(name)) {
      return { col: name, sql_type: type, not_null, nature: 'hierarchy' }
    }
    const values = db
      .query<{ v: string | number | null }, []>(
        `SELECT DISTINCT "${name}" AS v FROM "${table}" WHERE "${name}" IS NOT NULL LIMIT ${DISCRETE_THRESHOLD + 1}`
      )
      .all()
      .map((row) => String(row.v))
      .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))

    if (values.length <= DISCRETE_THRESHOLD) {
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
      const hasValue = db
        .query<{ ok: number }, []>(
          `SELECT 1 AS ok FROM "${table}" WHERE "${name}" IS NOT NULL LIMIT 1`
        )
        .get()
      if (hasValue) {
        const nonDate = db
          .query<{ ok: number }, []>(
            `SELECT 1 AS ok FROM "${table}"
             WHERE "${name}" IS NOT NULL
               AND NOT ("${name}" GLOB '????-??-??' AND length("${name}") = 10)
             LIMIT 1`
          )
          .get()
        if (!nonDate) {
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
       AND name NOT IN ('_readme', '_sources', '_build', 'documents')
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

  const describedTables = schema['tables'] as Array<{ columns?: Array<{ nature?: string }> }>
  if (
    describedTables.some((table) => table.columns?.some((column) => column.nature === 'hierarchy'))
  ) {
    schema['conventions'] = { hierarchy: HIERARCHY_CONVENTION }
  }

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

export const finishProfileDatabase = (db: Database, fingerprint: string): void => {
  db.run('DROP TABLE IF EXISTS _readme')
  db.run('CREATE TABLE _readme (content TEXT)')
  db.run('INSERT INTO _readme (content) VALUES (?)', [build_readme(db)])
  db.run('DROP TABLE IF EXISTS _build')
  db.run('CREATE TABLE _build (fingerprint TEXT NOT NULL)')
  db.run('INSERT INTO _build (fingerprint) VALUES (?)', [fingerprint])
}

export const ensurePostalReference = async (): Promise<void> => {
  const db = openDatastore()
  try {
    const present = db
      .query<{ n: number }, [string]>(
        `SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = ?`
      )
      .get(COMMUNES_PAR_CODE_POSTAL_TABLE)?.n
    if (present === 1) {
      const rows = db
        .query<{ n: number }, []>(`SELECT COUNT(*) AS n FROM "${COMMUNES_PAR_CODE_POSTAL_TABLE}"`)
        .get()?.n
      if (rows) return
    }
    await import_communes_par_code_postal_table(db)
  } finally {
    db.close()
  }
}

export const publishCoreTables = (
  payloads: ReadonlyMap<string, { columns: string[]; rows: DataRow[] }>
): void => {
  const db = openDatastore()
  try {
    db.run('BEGIN IMMEDIATE')
    try {
      for (const table of DATASTORE_TABLES) {
        const payload = payloads.get(table)
        if (payload) {
          void import_rows(db, table, payload.rows, {
            columns: payload.columns,
            transaction: false,
            refreshPostalReference: false
          })
        } else {
          db.run(`DROP TABLE IF EXISTS "${table}"`)
        }
      }
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

export const coreTablesMatch = (expected: readonly string[]): boolean => {
  const db = openDatastore({ readonly: true })
  try {
    const existing = new Set(
      db
        .query<{ name: string }, []>(`SELECT name FROM sqlite_master WHERE type = 'table'`)
        .all()
        .map((row) => row.name)
    )
    return (
      expected.every((table) => existing.has(table)) &&
      DATASTORE_TABLES.every((table) => expected.includes(table) || !existing.has(table))
    )
  } finally {
    db.close()
  }
}
