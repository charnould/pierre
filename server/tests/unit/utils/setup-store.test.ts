import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { migrate_datastore } from '../../../utils/datastore-migrations'
import { setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { SetupError, ticketsReady, writeSetup } from '../../../utils/setup-store'

const paths = testDatastorePaths('setup_store')

beforeEach(async () => {
  setDatastoreRoot(paths.root)
  await rm(paths.root, { recursive: true, force: true })
  await mkdir(paths.root, { recursive: true })
  await migrate_datastore(paths.database)
})

afterEach(async () => {
  setDatastoreRoot(null)
  await rm(paths.root, { recursive: true, force: true })
})

describe('setup store', () => {
  it('stores a valid tickets document before the docx, without marking the entry ready', async () => {
    const body = JSON.stringify({
      buckets: [{ id: 'non_traitees', label: 'Réclamations' }],
      actions: { dossier: ['Analyser le dossier'] },
      tags: ['Urgent']
    })
    await writeSetup('tickets', new TextEncoder().encode(body))
    expect(ticketsReady()).toBeNull()
  })

  it('rejects a tickets document without the system bucket', async () => {
    const body = JSON.stringify({
      buckets: [{ id: 'autre', label: 'Autre' }],
      actions: { dossier: ['Analyser le dossier'] },
      tags: ['Urgent']
    })
    await expect(writeSetup('tickets', new TextEncoder().encode(body))).rejects.toBeInstanceOf(
      SetupError
    )
  })
})
