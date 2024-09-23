import { Database } from 'bun:sqlite'
import * as sqlite_vec from 'sqlite-vec'
// Builtin SQLite library on MacOS doesn't allow extensions!
Database.setCustomSQLite('/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib')

export const db = (db_name: string) => {
  let db: sqlite_vec.Db | undefined = undefined

  if (db_name === 'knowledge') {
    db = new Database('./utils/knowledge/datastore.sqlite')
    sqlite_vec.load(db)
  }

  if (db_name === 'telemetry') db = new Database('./telemetry/datastore.sqlite')

  return db
}
