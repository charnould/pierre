import { Database } from 'bun:sqlite'

import { datastorePaths } from './paths'

export function openDatastore(options?: {
  readonly?: boolean
  path?: string
  create?: boolean
}): Database {
  const db = new Database(options?.path ?? datastorePaths().database, {
    ...(options?.readonly ? { readonly: true } : {}),
    ...(options?.create ? { create: true } : {})
  })
  db.run('PRAGMA busy_timeout = 5000')
  db.run('PRAGMA foreign_keys = ON')
  return db
}
