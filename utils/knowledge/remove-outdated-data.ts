import { $ } from 'bun'
import { Database } from 'bun:sqlite'
import type { Knowledge } from './_run'
import { Metadata } from './store-metadata'
import * as sqlite_vec from 'sqlite-vec'
import { stem } from '../stem-text'

/**
 * Removes outdated or irrelevant knowledge data from disk and proprietary SQLite datastore.
 *
 * This function performs cleanup for two categories of knowledge:
 * 1. Community knowledge:
 *    - Removes temporary datastore directory for the current service.
 *    - Removes the `./knowledge/wikipedia` folder and `./knowledge/data.sqlite`.
 *    - Calls `bun run utils/setup.ts` to rebuild community knowledge artifacts.
 *    - Ensures a custom SQLite library is used on macOS via `Database.setCustomSQLite(...)`.
 *
 * 2. Proprietary knowledge:
 *    - Opens an SQLite connection at `datastores/${Bun.env.SERVICE}/proprietary.sqlite`.
 *    - Loads `./datastores/${Bun.env.SERVICE}/metadata.json` (an array of Metadata entries).
 *    - Step 1: Removes any chunks and their vectors from the database whose `chunk_file`
 *      is no longer present in the metadata file.
 *    - Step 2: Removes chunks and vectors for files listed in metadata with `need_rebuild === true`.
 *    - Uses batched SQL deletes and concurrency (Promise.all) for per-file deletions.
 *
 * @param knowledge - An object indicating which knowledge sets to process:
 *   - `knowledge.community`: when true, refresh community knowledge artifacts.
 *   - `knowledge.proprietary`: when true, sync the proprietary SQLite datastore with metadata.
 *
 * @returns A Promise that resolves to void when cleanup completes. Errors are logged and suppressed;
 *          the promise will resolve even if some cleanup operations failed (the function catches exceptions).
 *
 * @remarks
 * - This operation is destructive.
 *   Ensure you have backups or are confident in the metadata before running.
 *
 */
export const remove_outdated_data = async (knowledge: Knowledge) => {
  try {
    await $`rm -rf ./datastores/${Bun.env.SERVICE}/temp`

    // COMMUNITY KNOWLEDGE
    if (knowledge.community) {
      Database.setCustomSQLite('/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib') // IMPORTANT: Builtin SQLite on MacOS doesn't allow extensions
      await $`rm -rf ./knowledge/wiki`
      await $`rm -rf ./knowledge/data.sqlite`
      await $`bun run utils/setup.ts`
    }

    // PROPRIETARY KNOWLEDGE
    if (knowledge.proprietary) {
      const db = new Database(`datastores/${Bun.env.SERVICE}/proprietary.sqlite`)
      sqlite_vec.load(db)

      const metadata: Metadata[] = await Bun.file(
        `./datastores/${Bun.env.SERVICE}/metadata.json`
      ).json()

      // STEP 1.
      // Remove proprietary chunks that are no longer present in the metadata
      //
      // Objective:
      // Go through all files stored in proprietary.sqlite and delete any chunk (both
      // in `chunks` and its associated vector in `vectors`) if it is no longer listed
      // in the latest metadata file. This ensures that the database stays in sync
      // with the current set of valid files

      // Fetch all unique files currently stored in the database
      const chunk_files = db.query(`SELECT DISTINCT chunk_file FROM chunks`).all().flat()

      for (const chunk_file of chunk_files) {
        // Check if this file still exists in the metadata
        const exists = metadata.some((m) => m.filename === chunk_file.chunk_file)
        if (exists) continue

        // If the file is no longer listed, remove it
        db.query(`DELETE FROM chunks WHERE chunk_file = ?;`).run(chunk_file.chunk_file)
        db.query(`DELETE FROM vectors WHERE chunk_file = ?;`).run(chunk_file.chunk_file)
      }

      // STEP 2.
      // Remove outdated chunks
      //
      // Objective:
      // Get unique filenames that need rebuild from `metadata.json
      // and delete related entries from knowledge database

      // prettier-ignore
      const files_to_rebuild = [ ...new Set(metadata.filter((m) => m.need_rebuild).map((m) => m.filename)) ]
      for (const filename of files_to_rebuild) {
        db.query(`DELETE FROM chunks WHERE chunk_file = ?`).run(filename)
        db.query(`DELETE FROM vectors WHERE chunk_file = ?;`).run(filename)
      }

      // STEP 3.
      // Rebuild FTS5/BM25 Table + Vaccum DB
      //
      // Objective:
      // Delete `stem` table
      // For each chunk, insert its stem into `stems` table
      // Finally, vacuum database

      db.query('DELETE FROM stems').run()

      const chunks = db.prepare('SELECT rowid, chunk_text FROM chunks').all() as Array<{
        rowid: number
        chunk_text: string
      }>

      db.transaction(() => {
        const insert = db.prepare('INSERT INTO stems(rowid, chunk_stem) VALUES (?, ?)')
        for (const { rowid, chunk_text } of chunks) insert.run(rowid, stem(chunk_text))
      })

      db.query(`PRAGMA foreign_keys = OFF; VACUUM; PRAGMA foreign_keys = ON;`).run()
    }

    console.log('✅ Outdated data removed')
    return
  } catch (e) {
    console.log('❌ Outdated data removal or database failed')
    console.log(e)
  }
}
