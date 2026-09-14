import { Database } from 'bun:sqlite'
import { link, mkdir, rename, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { DatastoreTable } from '../datastore-tables'
import { datastorePaths } from '../paths'
import {
  build_knowledge_databases,
  publishKnowledgeMirrors,
  type KnowledgeBuildArtifacts
} from './build-knowledge'
import {
  assignedKnowledgeItemKeys,
  assertNoOutputCollisions,
  flattenKnowledgeEntries,
  getKnowledgeCatalogSnapshot,
  type KnowledgeDiagnostic
} from './catalog'
import { ingest_files, loadCoreDataMirrors, setup_knowledge_directories } from './ingest-files'
import { listKnowledgeProfiles } from './profiles'

export class KnowledgeCatalogChangedError extends Error {
  constructor() {
    super('Knowledge catalog changed during build')
    this.name = 'KnowledgeCatalogChangedError'
  }
}

export class KnowledgePipelineError extends Error {
  constructor(
    message: string,
    readonly diagnostics: KnowledgeDiagnostic[],
    readonly itemKeys: string[]
  ) {
    super(message)
    this.name = 'KnowledgePipelineError'
  }
}

export type KnowledgePipelineResult = {
  catalogFingerprint: string
  diagnostics: KnowledgeDiagnostic[]
  itemKeys: string[]
  mirrorTables: DatastoreTable[]
}

const validateDatabase = (path: string): void => {
  const db = new Database(path, { readonly: true })
  try {
    const quickCheck = db.query<{ quick_check: string }, []>('PRAGMA quick_check').get()
    if (quickCheck?.quick_check !== 'ok') throw new Error(`Invalid knowledge database: ${path}`)
    const readme = db
      .query<{ n: number }, []>(
        "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = '_readme'"
      )
      .get()
    if (readme?.n !== 1) throw new Error(`Knowledge database has no _readme: ${path}`)
  } finally {
    db.close()
  }
}

const publishDatabases = async (
  artifacts: KnowledgeBuildArtifacts,
  knowledgeRoot: string
): Promise<{ commit: () => Promise<void>; rollback: () => Promise<void> }> => {
  const published: Array<{ livePath: string; backupPath: string | null }> = []
  const rollback = async () => {
    for (const publication of published.reverse()) {
      if (publication.backupPath) {
        await rename(publication.backupPath, publication.livePath)
      } else {
        await rm(publication.livePath, { force: true })
      }
    }
  }

  try {
    for (const candidate of artifacts.databases) {
      const livePath = join(knowledgeRoot, candidate.profileId, 'db.sqlite')
      await mkdir(dirname(livePath), { recursive: true })
      const backupPath = (await Bun.file(livePath).exists())
        ? `${livePath}.previous-${Bun.randomUUIDv7()}`
        : null
      if (backupPath) await link(livePath, backupPath)
      published.push({ livePath, backupPath })
      await rename(candidate.path, livePath)
    }
  } catch (error) {
    await rollback()
    throw error
  }

  return {
    rollback,
    commit: async () => {
      await Promise.allSettled(
        published.map(({ backupPath }) =>
          backupPath ? rm(backupPath, { force: true }) : Promise.resolve()
        )
      )
    }
  }
}

export const runKnowledgePipeline = async (
  buildId: string,
  service?: string,
  previouslyManagedMirrors: readonly string[] = []
): Promise<KnowledgePipelineResult> => {
  const paths = datastorePaths(service)
  const stagingRoot = join(paths.knowledge, '.staging', buildId)
  const diagnostics: KnowledgeDiagnostic[] = []
  let itemKeys: string[] = []

  await rm(stagingRoot, { recursive: true, force: true })
  await mkdir(stagingRoot, { recursive: true })

  try {
    const snapshot = getKnowledgeCatalogSnapshot(service)
    itemKeys = assignedKnowledgeItemKeys(snapshot)
    const profiles = await listKnowledgeProfiles()
    const knownIds = profiles.map((profile) => profile.id)
    assertNoOutputCollisions(snapshot.sources, new Set(knownIds))
    await setup_knowledge_directories(stagingRoot, profiles)
    const entries = flattenKnowledgeEntries(snapshot, service, knownIds)
    const [{ anomalies }, { mirrors: coreMirrors, anomalies: coreAnomalies }] = await Promise.all([
      ingest_files(entries, stagingRoot, profiles),
      loadCoreDataMirrors(snapshot, service)
    ])
    const seenAnomalies = new Set<string>()
    for (const anomaly of [...anomalies, ...coreAnomalies]) {
      const key = `${anomaly.code}:${anomaly.subject}`
      if (seenAnomalies.has(key)) continue
      seenAnomalies.add(key)
      diagnostics.push({
        level: anomaly.code === 'SOURCE_FILE_MISSING' ? 'error' : 'warning',
        code: anomaly.code,
        message:
          anomaly.code === 'SOURCE_FILE_MISSING'
            ? 'Le fichier source est introuvable.'
            : 'Le profil de connaissance est introuvable.',
        subject: anomaly.subject
      })
    }
    if (diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
      throw new KnowledgePipelineError('Knowledge source validation failed', diagnostics, itemKeys)
    }

    const artifacts = await build_knowledge_databases(stagingRoot)
    for (const [table, payload] of coreMirrors) {
      artifacts.mirrorTables.set(table, payload)
    }
    for (const candidate of artifacts.databases) validateDatabase(candidate.path)

    if (getKnowledgeCatalogSnapshot(service).fingerprint !== snapshot.fingerprint) {
      throw new KnowledgeCatalogChangedError()
    }

    const publication = await publishDatabases(artifacts, paths.knowledge)
    try {
      await publishKnowledgeMirrors(artifacts, service, previouslyManagedMirrors)
      await publication.commit()
    } catch (error) {
      await publication.rollback()
      throw error
    }
    return {
      catalogFingerprint: snapshot.fingerprint,
      diagnostics,
      itemKeys,
      mirrorTables: [...artifacts.mirrorTables.keys()] as DatastoreTable[]
    }
  } catch (error) {
    if (error instanceof KnowledgeCatalogChangedError || error instanceof KnowledgePipelineError) {
      throw error
    }
    throw new KnowledgePipelineError(
      error instanceof Error ? error.message : String(error),
      diagnostics,
      itemKeys
    )
  } finally {
    await rm(stagingRoot, { recursive: true, force: true })
  }
}
