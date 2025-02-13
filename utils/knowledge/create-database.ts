import { Database } from 'bun:sqlite'
import chalk from 'chalk'
import ora from 'ora'
import * as sqliteVec from 'sqlite-vec'
import type { Args } from './_run'

// Builtin SQLite library on MacOS doesn't allow extensions
//Database.setCustomSQLite('/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib')

export const create_database = async (args: Args) => {
  // No need for try/catch because this function should never throw

  // Start spinner
  const spinner = ora('Initialisation des bases de connaissances').start()

  // Helper function to initialize a database
  const initialize_db = (path: string) => {
    const db = new Database(path)
    sqliteVec.load(db)

    db.exec(`
      CREATE TABLE chunks (
        chunk_hash TEXT,
        chunk_tokens NUMBER DEFAULT NULL,
        chunk_text TEXT NOT NULL,
        chunk_stem TEXT NOT NULL
      );`)

    db.exec(`
      CREATE VIRTUAL TABLE stems USING FTS5(chunk_stem);
      `)

    db.exec(`
      CREATE VIRTUAL TABLE vectors USING vec0(
        chunk_hash TEXT,
        chunk_text TEXT,
        chunk_vector FLOAT[3072]
      );`)

    return db
  }

  if (args['--community'] === true) {
    initialize_db('./knowledge/community.sqlite')
  }

  if (args['--proprietary'] === true) {
    initialize_db('./datastores/proprietary.private.sqlite')
    initialize_db('./datastores/proprietary.public.sqlite')
  }

  // End spinner
  spinner.succeed(chalk.green('Bases de connaissances initialisées'))
  return
}
