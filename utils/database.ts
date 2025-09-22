import { Database } from 'bun:sqlite'
import * as sqlite_vec from 'sqlite-vec'
import { z } from 'zod'

/**
 * Initializes and returns a SQLite database instance based on the provided database name.
 *
 * - If `db_name` is `community`, loads the database from `./knowledge/data.sqlite` and applies `sqlite_vec` extensions.
 * - If `db_name` is `proprietary`, loads the database from a path based on the current service environment and applies `sqlite_vec` extensions.
 * - Throws an error if an invalid `db_name` is provided.
 *
 * @param db_name - The name of the database to initialize. Must be either `community` or `proprietary`.
 * @returns The initialized `Database` instance, possibly extended with `sqlite_vec.Db` methods.
 * @throws {Error} If an invalid `db_name` is provided.
 */
export const db = (db_name: Db_Name): Database | (Database & sqlite_vec.Db) => {
  if (db_name === 'community') {
    const db = new Database('./knowledge/data.sqlite')
    sqlite_vec.load(db)
    return db
  }

  if (db_name === 'proprietary') {
    const db = new Database(`./datastores/${Bun.env.SERVICE}/proprietary.sqlite`)
    sqlite_vec.load(db)
    return db
  }

  throw new Error('Invalid db_name. Database not initialized.')
}

// Zod schema/TS type
const Db_Name = z.enum(['community', 'proprietary'])
export type Db_Name = z.infer<typeof Db_Name>
