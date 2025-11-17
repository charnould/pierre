import { Database } from 'bun:sqlite'
import { $ } from 'bun'
import * as sqliteVec from 'sqlite-vec'
import { db } from '../database'
import type { Knowledge } from './_run'

/**
 * Removes outdated data from the knowledge base and reinitializes databases if necessary.
 *
 * @param knowledge - An object containing information about the knowledge base.
 * @param knowledge.community - A boolean indicating if community data should be removed.
 * @param knowledge.proprietary - A boolean indicating if proprietary data should be removed.
 *
 * @returns A promise that resolves when the cleaning and reinitialization process is complete.
 *
 * @throws Will log an error message if there is an issue during the cleaning or database operations.
 */
export const remove_outdated_data = async (knowledge: Knowledge) => {
  try {
    await $`rm -rf ./datastores/${Bun.env.SERVICE}/temp`

    if (knowledge.community === true) {
      // Builtin SQLite library on MacOS doesn't allow extensions
      Database.setCustomSQLite('/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib')

      await $`rm -rf ./knowledge/wiki`
      await $`rm -rf ./knowledge/data.sqlite`
      initialize_database({ proprietary: false, community: true })
    }

    if (knowledge.proprietary === true) {
      let database = db('proprietary') as Database

      database.run(`
        PRAGMA foreign_keys = OFF;
        DROP TABLE IF EXISTS chunks;
        DROP TABLE IF EXISTS stems;
        DROP TABLE IF EXISTS vectors;
        VACUUM;
        PRAGMA foreign_keys = ON;
        `)

      initialize_database({ proprietary: true, community: false })
    }

    console.log('✅ Outdated data removed')
    return
  } catch (e) {
    console.log('❌ Outadate data removal or database failed')
    console.log(e)
  }
}

/**
 * Initializes the database based on the provided knowledge configuration.
 *
 * This function sets up SQLite databases with specific schemas for storing chunks,
 * stems, and vectors. It uses the `sqliteVec` extension to load vector support.
 *
 * @param knowledge - An object containing configuration flags for community and proprietary databases.
 * @returns Returns when the databases are successfully created.
 *
 * @throws Will log an error message if there is an issue during database creation.
 *
 */
export const initialize_database = (knowledge: Knowledge) => {
  /**
   * Initializes a SQLite database at the specified file path, creates required tables,
   * and loads the sqliteVec extension. The database schema includes:
   * - `chunks`: Stores chunk metadata and text.
   * - `stems`: Full-text search virtual table for chunk stems.
   * - `vectors`: Vector search virtual table for chunk vectors.
   *
   * @param path - The file path to the SQLite database.
   * @returns The initialized Database instance.
   */
  const initialize_db = (path: string) => {
    const db = new Database(path)
    sqliteVec.load(db)

    db.run(`
      CREATE TABLE chunks (
        chunk_hash TEXT,
        chunk_file TEXT,
        chunk_access TEXT,
        chunk_tokens NUMBER DEFAULT NULL,
        chunk_text TEXT NOT NULL
      );
      
      CREATE VIRTUAL TABLE stems USING FTS5(chunk_stem);

      CREATE VIRTUAL TABLE vectors USING vec0(
        chunk_hash TEXT,
        chunk_file TEXT,
        chunk_access TEXT PARTITION KEY,
        chunk_text TEXT,
        chunk_vector FLOAT[1024]
      );`)

    return db
  }

  if (knowledge.community) initialize_db('./knowledge/data.sqlite')
  if (knowledge.proprietary) initialize_db(`./datastores/${Bun.env.SERVICE}/proprietary.sqlite`)

  console.log('✅ Databases hot and ready')
  return
}
