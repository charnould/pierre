import { Database } from 'bun:sqlite'
import * as sqlite_vec from 'sqlite-vec'
import { z } from 'zod'

// Database Factory Function
//
// This function initializes and returns a database connection based on the
// specified database name. It supports multiple predefined database names, each
// pointing to a specific SQLite file. For vector databases, the `sqlite_vec`
// module is loaded to provide vector search.
export const db = (db_name: Db_Name): Database | (Database & sqlite_vec.Db) => {
  if (db_name === 'community') {
    const db = new Database('./knowledge/data.sqlite')
    sqlite_vec.load(db)
    return db
  }

  if (db_name === 'proprietary.private') {
    const db = new Database(`./datastores/${Bun.env.SERVICE}/proprietary.private.sqlite`)
    sqlite_vec.load(db)
    return db
  }

  if (db_name === 'proprietary.public') {
    const db = new Database(`./datastores/${Bun.env.SERVICE}/proprietary.public.sqlite`)
    sqlite_vec.load(db)
    return db
  }

  throw new Error('Invalid db_name. Database not initialized.')
}

// Zod schema/TS type
const Db_Name = z.enum(['community', 'proprietary.private', 'proprietary.public'])
export type Db_Name = z.infer<typeof Db_Name>
