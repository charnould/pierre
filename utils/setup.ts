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

  const community = new Database('./knowledge/data.sqlite')
  sqlite_vec.load(community)
  community.run(`
      CREATE TABLE IF NOT EXISTS chunks
        (
          chunk_hash TEXT,
          chunk_file TEXT,
          chunk_access TEXT,
          chunk_build TEXT DEFAULT NULL,
          chunk_tokens NUMBER DEFAULT NULL,
          chunk_text TEXT NOT NULL
        );
      
      CREATE VIRTUAL TABLE IF NOT EXISTS stems USING FTS5(chunk_stem);

      CREATE VIRTUAL TABLE IF NOT EXISTS vectors USING vec0
        (
          chunk_hash TEXT,
          chunk_file TEXT,
          chunk_access TEXT PARTITION KEY,
          chunk_text TEXT,
          chunk_vector FLOAT[1024]
        );
    `)

  const proprietary = new Database(`datastores/${Bun.env.SERVICE}/proprietary.sqlite`)
  sqlite_vec.load(proprietary)
  proprietary.run(`
    CREATE TABLE IF NOT EXISTS chunks
      (
        chunk_hash TEXT,
        chunk_file TEXT,
        chunk_access TEXT,
        chunk_build TEXT DEFAULT NULL,
        chunk_tokens NUMBER DEFAULT NULL,
        chunk_text TEXT NOT NULL
      );
      
      CREATE VIRTUAL TABLE IF NOT EXISTS stems USING FTS5(chunk_stem);

      CREATE VIRTUAL TABLE IF NOT EXISTS vectors USING vec0
        (
          chunk_hash TEXT,
          chunk_file TEXT,
          chunk_access TEXT PARTITION KEY,
          chunk_text TEXT,
          chunk_vector FLOAT[1024]
      );
    `)
}

await setup()
