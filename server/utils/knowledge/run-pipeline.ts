import { link, mkdir, readdir, rename, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { coreDataContractForFilename } from '../../../shared/core-data'
import { normalize_knowledge_name } from '../../../shared/knowledge'
import { qualifyReclamations } from '../carl-reclamations'
import { openDatastore } from '../datastore-db'
import { datastorePaths } from '../paths'
import { coreTablesMatch, ensurePostalReference, publishCoreTables } from './build-knowledge'
import {
  assertNoOutputCollisions,
  assignedKnowledgeItemKeys,
  coreDataFingerprint,
  getKnowledgeCatalogSnapshot,
  type KnowledgeDiagnostic,
  type KnowledgeProjection,
  knowledgeProjections,
  listKnowledgeBuilds,
  listKnowledgeSourceContents,
  profileBuildFingerprint
} from './catalog'
import { writeProfileFiles } from './profile-files'
import { listKnowledgeProfiles } from './profiles'
import {
  assertProfileDatabase,
  buildProfileDatabase,
  communityDocuments,
  documentParts,
  type ProfileDocument,
  publishedProfileFingerprint
} from './project-profile'
import { readDataTable, sourceTableName } from './source-tables'
import type { DataRow } from './sqlite-table-import'

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
  coreFingerprint: string
  diagnostics: KnowledgeDiagnostic[]
  itemKeys: string[]
}

const publishDatabases = async (
  databases: ReadonlyArray<{ profileId: string; path: string }>,
  knowledgeRoot: string
): Promise<{ commit: () => Promise<void>; rollback: () => Promise<void> }> => {
  const published: Array<{ livePath: string; backupPath: string | null }> = []
  const rollback = async () => {
    for (const publication of published.reverse()) {
      if (publication.backupPath) await rename(publication.backupPath, publication.livePath)
      else await rm(publication.livePath, { force: true })
    }
  }
  try {
    for (const candidate of databases) {
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

const documentsFor = (
  projections: readonly KnowledgeProjection[],
  community: readonly ProfileDocument[]
): ProfileDocument[] => {
  const documents = projections.flatMap((projection) => {
    if (projection.fileType !== 'md' && projection.fileType !== 'docx') return []
    const source = listKnowledgeSourceContents().find((item) => item.id === projection.sourceId)
    if (!source?.content) {
      throw new Error(`Contenu introuvable : ${projection.title}`)
    }
    const filename = normalize_knowledge_name(projection.title)
    return filename ? [{ filename, ...documentParts(source.content) }] : []
  })
  return [...documents, ...community]
}

export const runKnowledgePipeline = async (buildId: string): Promise<KnowledgePipelineResult> => {
  const paths = datastorePaths()
  const stagingRoot = join(paths.knowledge, '.staging', buildId)
  const diagnostics: KnowledgeDiagnostic[] = []
  let itemKeys: string[] = []
  await rm(stagingRoot, { recursive: true, force: true })
  await mkdir(stagingRoot, { recursive: true })

  try {
    const snapshot = getKnowledgeCatalogSnapshot()
    itemKeys = assignedKnowledgeItemKeys(snapshot)
    const profiles = await listKnowledgeProfiles()
    const knownIds = profiles.map((profile) => profile.id)
    assertNoOutputCollisions(snapshot.sources, new Set(knownIds))
    const projections = knowledgeProjections(snapshot, knownIds)
    const nextCore = coreDataFingerprint(snapshot.sources)
    const previous = listKnowledgeBuilds().find((build) => build.status === 'succeeded')
    const expectedCore = [
      ...new Set(
        snapshot.sources.flatMap((source) => {
          const contract = coreDataContractForFilename(source.originalName)
          return contract && source.fileType === 'csv' ? [contract.table] : []
        })
      )
    ]
    const coreReady = previous?.coreFingerprint === nextCore && coreTablesMatch(expectedCore)
    let corePayloads: Map<string, { columns: string[]; rows: DataRow[] }> | null = null
    if (!coreReady) {
      corePayloads = new Map()
      const db = openDatastore({ readonly: true })
      try {
        for (const source of snapshot.sources) {
          const contract = coreDataContractForFilename(source.originalName)
          if (!contract || source.fileType !== 'csv') continue
          corePayloads.set(contract.table, readDataTable(db, sourceTableName(source.id, 0)))
        }
      } finally {
        db.close()
      }
      const reclamations = corePayloads.get('reclamations')
      if (reclamations) {
        corePayloads.set('reclamations', await qualifyReclamations(reclamations))
      }
    }

    await ensurePostalReference()
    const needsCommunity = profiles.some((profile) => profile.communityKnowledge)
    const community = needsCommunity ? await communityDocuments() : []
    const candidates: Array<{ profileId: string; path: string }> = []
    for (const profile of profiles) {
      const assigned = projections.filter((projection) => projection.access === profile.id)
      const fingerprint = profileBuildFingerprint(profile, assigned)
      const livePath = join(paths.knowledge, profile.id, 'db.sqlite')
      if (publishedProfileFingerprint(livePath) === fingerprint) continue
      const candidate = join(stagingRoot, profile.id, 'db.sqlite')
      await mkdir(dirname(candidate), { recursive: true })
      const sqlTables = assigned.flatMap((projection) => {
        if (projection.fileType === 'md' || projection.fileType === 'docx') return []
        if (projection.coreDataTable && corePayloads) return []
        const source = projection.coreDataTable
          ? projection.coreDataTable
          : sourceTableName(projection.sourceId, projection.sheet ?? 0)
        return [{ source, target: normalize_knowledge_name(projection.title) }]
      })
      const rowTables = assigned.flatMap((projection) => {
        if (!projection.coreDataTable || !corePayloads) return []
        const payload = corePayloads.get(projection.coreDataTable)
        if (!payload) return []
        return [
          {
            target: normalize_knowledge_name(projection.title),
            columns: payload.columns,
            rows: payload.rows
          }
        ]
      })
      buildProfileDatabase({
        path: candidate,
        datastorePath: paths.database,
        sqlTables,
        rowTables,
        documents: documentsFor(assigned, profile.communityKnowledge ? community : []),
        fingerprint
      })
      assertProfileDatabase(candidate)
      candidates.push({ profileId: profile.id, path: candidate })
    }

    if (getKnowledgeCatalogSnapshot().fingerprint !== snapshot.fingerprint) {
      throw new KnowledgeCatalogChangedError()
    }
    const publication = await publishDatabases(candidates, paths.knowledge)
    try {
      if (corePayloads) publishCoreTables(corePayloads)
      await publication.commit()
    } catch (error) {
      await publication.rollback()
      throw error
    }
    const publishedIds = new Set(profiles.map((profile) => profile.id))
    const liveEntries = await readdir(paths.knowledge, { withFileTypes: true }).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return []
        throw error
      }
    )
    await Promise.all(
      liveEntries
        .filter(
          (entry) =>
            entry.isDirectory() && !entry.name.startsWith('.') && !publishedIds.has(entry.name)
        )
        .map((entry) => rm(join(paths.knowledge, entry.name), { recursive: true, force: true }))
    )
    await Promise.all(profiles.map((profile) => writeProfileFiles(profile.id)))
    return {
      catalogFingerprint: snapshot.fingerprint,
      coreFingerprint: nextCore,
      diagnostics,
      itemKeys
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
