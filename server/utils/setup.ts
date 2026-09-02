import { mkdir } from 'node:fs/promises'

import { migrate_datastore } from './datastore-migrations'
import { datastorePaths } from './paths'

/**
 * Initialise le datastore applicatif PIERRE (`datastore.sqlite`).
 * Distinct des tables HLM importées (reclamations, lots_locatifs, …).
 */
export const setup = async () => {
  const paths = datastorePaths()
  await Promise.all([
    mkdir(paths.files, { recursive: true }),
    mkdir(paths.knowledge, { recursive: true })
  ])
  await migrate_datastore(paths.database)
}
