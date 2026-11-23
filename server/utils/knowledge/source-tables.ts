import type { Database } from 'bun:sqlite'

import type { DataRow } from './sqlite-table-import'

const quote = (identifier: string): string => `"${identifier.replaceAll('"', '""')}"`

export const sourceTableName = (sourceId: string): string => {
  const compact = sourceId.replaceAll('-', '')
  if (!/^[0-9a-f]{32}$/i.test(compact)) {
    throw new Error('Invalid knowledge source table')
  }
  return `knowledge_source_${compact}`
}

export const dropSourceTable = (db: Database, sourceId: string): void => {
  db.run(`DROP TABLE IF EXISTS ${quote(sourceTableName(sourceId))}`)
}

const tableColumns = (db: Database, table: string): string[] =>
  db
    .query<{ name: string }, [string]>(`SELECT name FROM pragma_table_info(?) ORDER BY cid`)
    .all(table)
    .map((column) => column.name)

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
