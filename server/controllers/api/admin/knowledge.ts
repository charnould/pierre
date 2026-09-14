import { join } from 'node:path'

import type { Context } from 'hono'
import { z } from 'zod/v4'

import { CORE_DATA_CONTRACT, coreDataContractForFilename } from '../../../../shared/core-data'
import {
  isKnowledgeEntryAssigned,
  type KnowledgeData,
  type KnowledgeSource as KnowledgeSourceDto
} from '../../../../shared/knowledge'
import { requestKnowledgeBuild } from '../../../utils/knowledge/build-coordinator'
import {
  deleteKnowledgeSource,
  getKnowledgeCatalogSnapshot,
  getKnowledgeSource,
  KnowledgeEntrySchema,
  knowledgeItemKey,
  listKnowledgeBuilds,
  replaceKnowledgeSourceEntries,
  type KnowledgeSource
} from '../../../utils/knowledge/catalog'
import { importKnowledgeFiles, KnowledgeImportError } from '../../../utils/knowledge/import-files'
import { KnowledgeCsvError } from '../../../utils/knowledge/ingest-files'
import { listKnowledgeProfiles } from '../../../utils/knowledge/profiles'
import { datastorePaths } from '../../../utils/paths'

export const MAX_KNOWLEDGE_UPLOAD_BYTES = 100 * 1024 * 1024

const PatchSourceBody = z
  .object({
    entries: z.array(KnowledgeEntrySchema),
    updatedAt: z.iso.datetime()
  })
  .strict()

const apiError = (c: Context, status: 400 | 404 | 409 | 500, code: string, message: string) =>
  c.json({ error: { code, message } }, status)

const requester = (c: Context): string | null => c.get('user')?.email ?? null

const isAssigned = (source: KnowledgeSource): boolean =>
  source.entries.some((entry) => isKnowledgeEntryAssigned(entry))

export const toKnowledgeSourceDto = (source: KnowledgeSource): KnowledgeSourceDto => {
  const contract = coreDataContractForFilename(source.originalName)
  return {
    ...source,
    itemKeys: source.entries.map((entry) => knowledgeItemKey(source.id, entry)),
    coreDataEntries: contract && source.entries[0] ? [{ index: 0, table: contract.table }] : []
  }
}

export const getKnowledge = async (c: Context) => {
  const profiles = await listKnowledgeProfiles()
  const builds = listKnowledgeBuilds()
  const snapshot = getKnowledgeCatalogSnapshot()
  const lastSuccessfulBuild = builds.find(({ status }) => status === 'succeeded')
  const hasPublishableSources = snapshot.sources.some(
    (source) => isAssigned(source) || coreDataContractForFilename(source.originalName) !== null
  )
  const data = {
    sources: snapshot.sources.map(toKnowledgeSourceDto),
    profiles,
    coreDataTables: CORE_DATA_CONTRACT.map(({ table, filename, label }) => ({
      table,
      filename,
      label
    })),
    lastBuild: builds[0] ?? null,
    needsRebuild: lastSuccessfulBuild
      ? lastSuccessfulBuild.catalogFingerprint !== snapshot.fingerprint
      : hasPublishableSources
  } satisfies KnowledgeData
  return c.json({ data })
}

export const postKnowledgeSources = async (c: Context) => {
  try {
    const origin = c.req.header('authorization')?.startsWith('Bearer ') ? 'cli' : 'ui'
    const body = await c.req.parseBody({ all: true })
    const rawFiles = body['files[]'] ?? body['files']
    const files = (Array.isArray(rawFiles) ? rawFiles : [rawFiles]).filter(
      (value): value is File => value instanceof File
    )
    const { sources, shouldBuild } = await importKnowledgeFiles(files, origin)
    if (shouldBuild) requestKnowledgeBuild('upload', requester(c))
    return c.json(
      {
        data: {
          sources: sources.map((item) => ({ ...item, source: toKnowledgeSourceDto(item.source) }))
        }
      },
      201
    )
  } catch (error) {
    if (error instanceof KnowledgeImportError) {
      return apiError(c, error.status, error.code, error.message)
    }
    if (error instanceof KnowledgeCsvError) return apiError(c, 400, error.code, error.message)
    console.error(error)
    return apiError(c, 500, 'upload_failed', 'Impossible d’importer le fichier.')
  }
}

export const patchKnowledgeSource = async (c: Context) => {
  const id = c.req.param('id')
  if (!id) return apiError(c, 404, 'source_not_found', 'Source introuvable.')
  const previous = getKnowledgeSource(id)
  if (!previous) return apiError(c, 404, 'source_not_found', 'Source introuvable.')
  const parsed = PatchSourceBody.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return apiError(c, 400, 'invalid_source', 'Configuration invalide.')
  if (JSON.stringify(previous.entries) === JSON.stringify(parsed.data.entries)) {
    return c.json({ data: { source: toKnowledgeSourceDto(previous) } })
  }

  try {
    const profiles = await listKnowledgeProfiles()
    const source = replaceKnowledgeSourceEntries(
      id,
      parsed.data.entries,
      new Set(profiles.map((profile) => profile.id)),
      parsed.data.updatedAt
    )
    if (!source) return apiError(c, 404, 'source_not_found', 'Source introuvable.')
    return c.json({ data: { source: toKnowledgeSourceDto(source) } })
  } catch (error) {
    return apiError(
      c,
      409,
      'source_conflict',
      error instanceof Error ? error.message : 'Configuration incompatible.'
    )
  }
}

export const deleteKnowledgeSourceController = async (c: Context) => {
  const id = c.req.param('id')
  if (!id) return apiError(c, 404, 'source_not_found', 'Source introuvable.')
  const source = getKnowledgeSource(id)
  if (!source) return apiError(c, 404, 'source_not_found', 'Source introuvable.')

  try {
    deleteKnowledgeSource(source.id)
  } catch {
    return apiError(c, 500, 'delete_failed', 'La source ne peut pas être supprimée.')
  }
  try {
    const file = Bun.file(join(datastorePaths().files, source.storageName))
    if (await file.exists()) await file.delete()
  } catch {
    // Catalogue already dropped; leftover bytes are unused.
  }
  return c.json({ data: { id: source.id } })
}

export const downloadKnowledgeSource = async (c: Context) => {
  const id = c.req.param('id')
  if (!id) return apiError(c, 404, 'source_not_found', 'Source introuvable.')
  const source = getKnowledgeSource(id)
  if (!source) return apiError(c, 404, 'source_not_found', 'Source introuvable.')
  const file = Bun.file(join(datastorePaths().files, source.storageName))
  if (!(await file.exists())) return apiError(c, 404, 'file_not_found', 'Fichier introuvable.')
  c.header(
    'Content-Disposition',
    `attachment; filename*=UTF-8''${encodeURIComponent(source.originalName)}`
  )
  c.header('Content-Type', file.type || 'application/octet-stream')
  return c.body(file.stream())
}

export const getKnowledgeBuilds = (c: Context) =>
  c.json({ data: { builds: listKnowledgeBuilds() } })

export const postKnowledgeBuild = (c: Context) => {
  const build = requestKnowledgeBuild('manual', requester(c))
  return c.json({ data: { build } }, 202)
}
