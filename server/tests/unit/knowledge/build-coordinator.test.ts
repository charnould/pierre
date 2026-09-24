import { afterAll, beforeAll, expect, it } from 'bun:test'
import { mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { migrate_datastore } from '../../../utils/datastore-migrations'
import {
  cleanupKnowledgeStaging,
  initializeKnowledgeBuildCoordinator,
  requestKnowledgeBuild
} from '../../../utils/knowledge/build-coordinator'
import {
  createKnowledgeBuild,
  failInterruptedKnowledgeBuilds,
  getKnowledgeBuild,
  getKnowledgeCatalogSnapshot,
  insertKnowledgeSource,
  listKnowledgeBuilds,
  replaceKnowledgeSourceEntries
} from '../../../utils/knowledge/catalog'
import { datastorePaths, setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { seedInstanceSetup } from '../../seed-setup'

const paths = testDatastorePaths('knowledge_coordinator')

beforeAll(async () => {
  setDatastoreRoot(paths.root)
  await mkdir(paths.files, { recursive: true })
  await mkdir(paths.knowledge, { recursive: true })
  await migrate_datastore(paths.database)
  await seedInstanceSetup()
})

afterAll(async () => {
  await rm(datastorePaths().root, { recursive: true, force: true })
  setDatastoreRoot(null)
})

const waitForBuild = async (id: string) => {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    const build = getKnowledgeBuild(id)
    if (build?.status === 'succeeded' || build?.status === 'failed') return build
    await Bun.sleep(50)
  }
  throw new Error(`Build ${id} did not finish`)
}

it('coalesces concurrent rebuild requests into one persisted build', async () => {
  const requests = Array.from({ length: 5 }, () => requestKnowledgeBuild('manual', null))
  expect(new Set(requests.map(({ id }) => id)).size).toBe(1)

  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    const build = listKnowledgeBuilds()[0]
    if (build?.status === 'succeeded' || build?.status === 'failed') break
    await Bun.sleep(50)
  }

  const builds = listKnowledgeBuilds()
  expect(builds).toHaveLength(1)
  expect(builds[0]?.status).toBe('succeeded')
})

it('persists success and failure per assigned item', async () => {
  const paths = datastorePaths()
  await Bun.write(`${paths.files}/guide.md`, '# Guide')
  const source = insertKnowledgeSource({
    storageName: 'guide.md',
    originalName: 'Guide.md',
    fileType: 'md',
    sizeBytes: 7,
    contentHash: 'a'.repeat(64),
    origin: 'ui',
    entries: []
  })
  replaceKnowledgeSourceEntries(
    source.id,
    [
      {
        title: 'Guide',
        sheet: null,
        sheetName: null,
        headerRow: null,
        profileIds: ['default']
      }
    ],
    new Set(['default'])
  )

  const successful = await waitForBuild(requestKnowledgeBuild('patch', null).id)
  expect(successful.items).toEqual([{ key: `${source.id}:document`, status: 'succeeded' }])
  expect(successful.catalogFingerprint).toBe(getKnowledgeCatalogSnapshot().fingerprint)

  await Bun.file(`${paths.files}/guide.md`).delete()
  const failed = await waitForBuild(requestKnowledgeBuild('upload', null).id)
  expect(failed.status).toBe('failed')
  expect(failed.items).toEqual([{ key: `${source.id}:document`, status: 'failed' }])
})

it('cleans abandoned staging directories without touching an active build', async () => {
  const stagingRoot = join(datastorePaths().knowledge, '.staging')
  const active = createKnowledgeBuild('manual', null)
  await mkdir(join(stagingRoot, 'missing-build'), { recursive: true })
  await mkdir(join(stagingRoot, active.id), { recursive: true })

  await cleanupKnowledgeStaging()
  expect(await readdir(stagingRoot)).toEqual([active.id])

  failInterruptedKnowledgeBuilds(new Date(Date.now() + 1000))
  await cleanupKnowledgeStaging()
  expect(await readdir(stagingRoot)).toEqual([])
})

it('replaces an active build inherited from the previous process', async () => {
  const inherited = createKnowledgeBuild('manual', null)

  const startup = await initializeKnowledgeBuildCoordinator()

  expect(startup.id).not.toBe(inherited.id)
  expect(getKnowledgeBuild(inherited.id)?.status).toBe('failed')
  expect(['succeeded', 'failed']).toContain((await waitForBuild(startup.id)).status)
})
