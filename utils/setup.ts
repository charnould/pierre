import { Database } from 'bun:sqlite'
import { $ } from 'bun'
import * as sqlite_vec from 'sqlite-vec'

// Builtin SQLite library on MacOS doesn't allow extensions
Database.setCustomSQLite('/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib')

export const setup = async () => {
  if (Bun.env.SERVICE === undefined) Bun.env.SERVICE = 'default'

  await $`mkdir -p datastores/${Bun.env.SERVICE}`
  await $`mkdir -p datastores/${Bun.env.SERVICE}/files`
  await $`mkdir -p datastores/${Bun.env.SERVICE}/temp`

  sqlite_vec.load(new Database('./knowledge/data.sqlite'))
  sqlite_vec.load(new Database(`./datastores/${Bun.env.SERVICE}/proprietary.sqlite`))

  new Database(`datastores/${Bun.env.SERVICE}/datastore.sqlite`).run(`
    CREATE TABLE IF NOT EXISTS telemetry
      (
        conv_id     TEXT,
        config      TEXT,
        role        TEXT,
        timestamp   TEXT,
        content     TEXT,
        metadata    TEXT,
        UNIQUE(conv_id, timestamp)
      );

    CREATE TABLE IF NOT EXISTS users
      (
        config          TEXT NOT NULL,
        email           TEXT PRIMARY KEY UNIQUE NOT NULL,
        role            TEXT NOT NULL,
        password_hash   TEXT NOT NULL
      );
    `)
}

await setup()
