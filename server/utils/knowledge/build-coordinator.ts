import { readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { datastorePaths } from '../paths'
import {
  completeKnowledgeBuild,
  createKnowledgeBuild,
  failInterruptedKnowledgeBuilds,
  getActiveKnowledgeBuild,
  getKnowledgeBuild,
  listKnowledgeBuilds,
  purgeOldKnowledgeBuilds,
  updateKnowledgeBuild,
  type KnowledgeBuild,
  type KnowledgeDiagnostic,
  type KnowledgeBuildTrigger
} from './catalog'
import {
  KnowledgeCatalogChangedError,
  KnowledgePipelineError,
  runKnowledgePipeline
} from './run-pipeline'

const PROCESS_ID = Bun.randomUUIDv7()
let worker: Promise<void> | null = null
let currentBuild: KnowledgeBuild | null = null
let pending: { trigger: KnowledgeBuildTrigger; requestedBy: string | null } | null = null

const changesCatalog = (trigger: KnowledgeBuildTrigger): boolean =>
  trigger === 'upload' || trigger === 'patch' || trigger === 'delete'

const executeBuild = async (build: KnowledgeBuild): Promise<void> => {
  const heartbeat = setInterval(() => {
    updateKnowledgeBuild(build.id, { heartbeatAt: new Date().toISOString() })
  }, 30_000)
  updateKnowledgeBuild(build.id, {
    status: 'running',
    startedAt: new Date().toISOString(),
    ownerId: PROCESS_ID,
    heartbeatAt: new Date().toISOString()
  })

  try {
    let mirrorTables = build.mirrorTables
    while (true) {
      updateKnowledgeBuild(build.id, { heartbeatAt: new Date().toISOString() })
      let result: Awaited<ReturnType<typeof runKnowledgePipeline>>
      try {
        result = await runKnowledgePipeline(build.id, undefined, mirrorTables)
      } catch (error) {
        if (error instanceof KnowledgeCatalogChangedError) continue
        throw error
      }
      completeKnowledgeBuild(build.id, {
        catalogFingerprint: result.catalogFingerprint,
        diagnostics: result.diagnostics,
        items: result.itemKeys.map((key) => ({ key, status: 'succeeded' })),
        mirrorTables: result.mirrorTables
      })
      return
    }
  } catch (error) {
    console.error('❌ Knowledge build failed', error)
    const diagnostics: KnowledgeDiagnostic[] =
      error instanceof KnowledgePipelineError
        ? error.diagnostics
        : [
            {
              level: 'error',
              code: 'build_failed',
              message: error instanceof Error ? error.message : String(error),
              subject: null
            }
          ]
    const items =
      error instanceof KnowledgePipelineError
        ? error.itemKeys.map((key) => ({ key, status: 'failed' as const }))
        : build.items
    updateKnowledgeBuild(build.id, {
      status: 'failed',
      finishedAt: new Date().toISOString(),
      items,
      diagnostics
    })
  } finally {
    clearInterval(heartbeat)
  }
}

const startWorker = (build: KnowledgeBuild): void => {
  currentBuild = build
  worker = executeBuild(build).finally(() => {
    worker = null
    currentBuild = null
    const next = pending
    pending = null
    if (next) requestKnowledgeBuild(next.trigger, next.requestedBy)
  })
}

export const requestKnowledgeBuild = (
  trigger: KnowledgeBuildTrigger,
  requestedBy: string | null
): KnowledgeBuild => {
  failInterruptedKnowledgeBuilds()

  if (worker) {
    if (changesCatalog(trigger)) pending = { trigger, requestedBy }
    const active = currentBuild ?? getActiveKnowledgeBuild()
    if (!active) throw new Error('Knowledge build worker is running without a lease')
    return active
  }

  purgeOldKnowledgeBuilds()
  const previous = listKnowledgeBuilds()[0]
  let build: KnowledgeBuild
  try {
    build = createKnowledgeBuild(
      trigger,
      requestedBy,
      previous?.mirrorTables ?? [],
      PROCESS_ID,
      previous?.items ?? []
    )
  } catch (error) {
    const active = getActiveKnowledgeBuild()
    if (!active) throw error
    return active
  }
  startWorker(build)
  return build
}

export const cleanupKnowledgeStaging = async (service?: string): Promise<void> => {
  const stagingRoot = join(datastorePaths(service).knowledge, '.staging')
  const entries = await readdir(stagingRoot, { withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return []
      throw error
    }
  )
  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const build = getKnowledgeBuild(entry.name, service)
        if (build?.status === 'queued' || build?.status === 'running') return
        await rm(join(stagingRoot, entry.name), { recursive: true, force: true })
      })
  )
}

export const initializeKnowledgeBuildCoordinator = async (): Promise<KnowledgeBuild> => {
  // A fresh process cannot resume work owned by the previous in-memory worker.
  failInterruptedKnowledgeBuilds(undefined, new Date(Date.now() + 1))
  await cleanupKnowledgeStaging()
  return requestKnowledgeBuild('startup', null)
}
