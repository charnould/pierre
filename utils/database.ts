import { Database } from 'bun:sqlite'
import * as sqlite_vec from 'sqlite-vec'
// Builtin SQLite library on MacOS doesn't allow extensions
Database.setCustomSQLite('/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib')

export const db = (db_name: 'knowledge' | 'telemetry'): sqlite_vec.Db | Database => {
  if (db_name === 'knowledge') {
    const knowledge_db: sqlite_vec.Db = new Database('./utils/knowledge/datastore.sqlite')
    sqlite_vec.load(knowledge_db)
    return knowledge_db
  }

  if (db_name === 'telemetry') {
    const telemetry_db: Database = new Database('./telemetry/datastore.sqlite')
    return telemetry_db
  }

  throw new Error('Invalid db_name. Database not initialized.')
}
