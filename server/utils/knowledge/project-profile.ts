import { Database } from 'bun:sqlite'
import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'

import { normalize_knowledge_name } from '../../../shared/knowledge'
import { SERVER_ROOT } from '../paths'
import { is_knowledge_pii_column } from '../pii-columns'
import { finishProfileDatabase } from './build-knowledge'
import { COMMUNES_PAR_CODE_POSTAL_TABLE } from './codes-postaux'
import { type DataRow, import_rows } from './sqlite-table-import'

const quote = (identifier: string): string => `"${identifier.replaceAll('"', '""')}"`

export type ProfileDocument = {
  filename: string
  content: string
  url: string | null
}

export type ProfileSqlTable = {
  source: string
  target: string
}

export type ProfileRowTable = {
  target: string
  columns: string[]
  rows: DataRow[]
}

export const documentParts = (raw: string): { content: string; url: string | null } => {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n+/)
  if (!match) return { content: raw, url: null }
  const url = match[1]?.match(/^url:\s*(.+)$/m)?.[1]?.trim() ?? null
  return { content: raw.slice(match[0].length), url }
}

let communityCache: Promise<ProfileDocument[]> | null = null

export const communityDocuments = (): Promise<ProfileDocument[]> => {
  communityCache ??= (async () => {
    const root = join(SERVER_ROOT, 'knowledge')
    const documents: ProfileDocument[] = []
    for await (const path of new Bun.Glob('**/*.md').scan({ cwd: root, onlyFiles: true })) {
      const filename = normalize_knowledge_name(basename(path, '.md'))
      if (!filename) continue
      documents.push({
        filename,
        ...documentParts(await Bun.file(join(root, path)).text())
      })
    }
    documents.sort((left, right) => left.filename.localeCompare(right.filename, 'fr'))
    return documents
  })()
  return communityCache
}

export const publishedProfileFingerprint = (path: string): string | null => {
  if (!existsSync(path)) return null
  let db: Database
  try {
    db = new Database(path, { readonly: true })
  } catch {
    return null
  }
  try {
    const names = new Set(
      db
        .query<{ name: string }, []>(`SELECT name FROM sqlite_master WHERE type = 'table'`)
        .all()
        .map((row) => row.name)
    )
    if (!names.has('_build') || !names.has('_readme')) return null
    return (
      db.query<{ fingerprint: string }, []>('SELECT fingerprint FROM _build LIMIT 1').get()
        ?.fingerprint ?? null
    )
  } catch {
    return null
  } finally {
    db.close()
  }
}

const copySqlTable = (db: Database, table: ProfileSqlTable): void => {
  const columns = db
    .query<{ name: string; type: string }, [string, string]>(
      `SELECT name, type FROM pragma_table_info(?, ?) ORDER BY cid`
    )
    .all(table.source, 'canonical')
    .filter((column) => !is_knowledge_pii_column(column.name))
  if (columns.length === 0) return
  const definitions = columns
    .map((column) => `${quote(column.name)} ${column.type || 'TEXT'}`)
    .join(', ')
  const names = columns.map((column) => quote(column.name)).join(', ')
  const target = quote(table.target)
  db.run(`CREATE TABLE ${target} (${definitions})`)
  db.run(`INSERT INTO ${target} (${names}) SELECT ${names} FROM canonical.${quote(table.source)}`)
}

export const buildProfileDatabase = (options: {
  path: string
  datastorePath: string
  sqlTables: readonly ProfileSqlTable[]
  rowTables: readonly ProfileRowTable[]
  documents: readonly ProfileDocument[]
  fingerprint: string
}): void => {
  const db = new Database(options.path, { create: true })
  try {
    db.run('PRAGMA busy_timeout = 5000')
    db.run('PRAGMA journal_mode = OFF')
    db.run('PRAGMA synchronous = FULL')
    db.run('PRAGMA temp_store = MEMORY')
    db.run('PRAGMA cache_size = -65536')
    const attached = options.datastorePath.replaceAll("'", "''")
    db.run(`ATTACH DATABASE '${attached}' AS canonical`)
    db.transaction(() => {
      for (const table of options.sqlTables) copySqlTable(db, table)
      for (const table of options.rowTables) {
        const columns = table.columns.filter((column) => !is_knowledge_pii_column(column))
        const rows = table.rows.map((row) =>
          Object.fromEntries(columns.map((column) => [column, row[column]]))
        )
        void import_rows(db, table.target, rows, {
          columns,
          transaction: false,
          refreshPostalReference: false
        })
      }
      const communes = db
        .query<{ n: number }, [string, string]>(`SELECT COUNT(*) AS n FROM pragma_table_info(?, ?)`)
        .get(COMMUNES_PAR_CODE_POSTAL_TABLE, 'canonical')?.n
      if (communes) {
        copySqlTable(db, {
          source: COMMUNES_PAR_CODE_POSTAL_TABLE,
          target: COMMUNES_PAR_CODE_POSTAL_TABLE
        })
      }
      db.run('DROP TABLE IF EXISTS documents')
      db.run(
        `CREATE VIRTUAL TABLE documents USING fts5(content, filename UNINDEXED, url UNINDEXED, tokenize = "unicode61 remove_diacritics 2 tokenchars '-'")`
      )
      const insert = db.prepare('INSERT INTO documents (content, filename, url) VALUES (?, ?, ?)')
      for (const document of options.documents) {
        insert.run(document.content, document.filename, document.url)
      }
      finishProfileDatabase(db, options.fingerprint)
    }).immediate()
    db.run('DETACH DATABASE canonical')
  } finally {
    db.close()
  }
}

export const assertProfileDatabase = (path: string): void => {
  const db = new Database(path, { readonly: true })
  try {
    const check = db.query<{ quick_check: string }, []>('PRAGMA quick_check').get()
    if (check?.quick_check !== 'ok') throw new Error(`Invalid knowledge database: ${path}`)
    const readme = db
      .query<{ n: number }, []>(
        `SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = '_readme'`
      )
      .get()
    if (readme?.n !== 1) throw new Error(`Knowledge database has no _readme: ${path}`)
  } finally {
    db.close()
  }
}
