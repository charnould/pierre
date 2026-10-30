import type { Database } from 'bun:sqlite'

import type { DataRow } from './sqlite-table-import'

const quote = (identifier: string): string => `"${identifier.replaceAll('"', '""')}"`

export const sourceTableName = (sourceId: string, sheet: number): string => {
  const compact = sourceId.replaceAll('-', '')
  if (!/^[0-9a-f]{32}$/i.test(compact) || !Number.isInteger(sheet) || sheet < 0) {
    throw new Error('Invalid knowledge source table')
  }
  return `knowledge_source_${compact}_${sheet}`
}

export const dropSourceSheet = (db: Database, sourceId: string, sheet: number): void => {
  db.run(`DROP TABLE IF EXISTS ${quote(sourceTableName(sourceId, sheet))}`)
}

export const dropSourceTables = (db: Database, sourceId: string): void => {
  const compact = sourceId.replaceAll('-', '')
  if (!/^[0-9a-f]{32}$/i.test(compact)) return
  const names = db
    .query<{ name: string }, [string]>(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name GLOB ?`
    )
    .all(`knowledge_source_${compact}_*`)
  for (const { name } of names) db.run(`DROP TABLE ${quote(name)}`)
}

export const tableColumns = (db: Database, table: string, schema = 'main'): string[] =>
  db
    .query<{ name: string }, [string, string]>(
      `SELECT name FROM pragma_table_info(?, ?) ORDER BY cid`
    )
    .all(table, schema)
    .map((column) => column.name)

export const tableExists = (db: Database, table: string, schema = 'main'): boolean =>
  tableColumns(db, table, schema).length > 0

export const readDataTable = (
  db: Database,
  table: string
): { columns: string[]; rows: DataRow[] } => {
  const columns = tableColumns(db, table)
  if (columns.length === 0) throw new Error(`Missing knowledge table ${table}`)
  return {
    columns,
    rows: db.query<DataRow, []>(`SELECT * FROM ${quote(table)}`).all()
  }
}
