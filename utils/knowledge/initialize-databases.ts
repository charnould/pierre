import { Database } from 'bun:sqlite'
import * as sqliteVec from 'sqlite-vec'
import type { Knowledge } from './_run'

// Builtin SQLite library on MacOS doesn't allow extensions
//Database.setCustomSQLite('/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib')

export const initialize_databases = async (knowledge: Knowledge) => {
  try {
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

    if (knowledge.community === true) {
      initialize_db('./knowledge/community.sqlite')
    }

    if (knowledge.proprietary === true) {
      initialize_db('./datastores/proprietary.private.sqlite')
      initialize_db('./datastores/proprietary.public.sqlite')
    }

    console.log('✅ Databases created')
    return
  } catch (e) {
    console.log('🆘 Databases creation error')
    console.log(e)
  }
}
