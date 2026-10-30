import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { migrate_datastore } from './datastore-migrations'
import { datastorePaths } from './paths'

/**
 * Initialise le datastore applicatif PIERRE (`datastore.sqlite`).
 * Distinct des tables HLM importées (reclamations, lots_locatifs, …).
 */
export const setup = async () => {
  const paths = datastorePaths()
  await mkdir(paths.root, { recursive: true })
  const applied = await migrate_datastore(paths.database)
  if (applied.includes(1)) {
    await Promise.all([
      rm(join(paths.root, 'files'), { recursive: true, force: true }),
      rm(paths.knowledge, { recursive: true, force: true })
    ])
  }
  await mkdir(paths.knowledge, { recursive: true })
}

if (import.meta.main) await setup()
