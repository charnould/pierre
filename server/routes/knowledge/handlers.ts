import { z } from 'zod/v4'

import { CORE_DATA_CONTRACT, coreDataContractForFilename } from '../../../shared/core-data'
import {
  isKnowledgeSourceAssigned,
  type KnowledgeData,
  type KnowledgeSource as KnowledgeSourceDto,
  type WorkbookSheetConfig
} from '../../../shared/knowledge'
import type { AuthContext } from '../../utils/authenticate-user'
import { requestKnowledgeBuild } from '../../utils/knowledge/build-coordinator'
import {
  deleteKnowledgeSource,
  getKnowledgeCatalogSnapshot,
  getKnowledgeSource,
  KnowledgeModuleIdsSchema,
  KnowledgeProfileIdsSchema,
  type KnowledgeSource,
  listKnowledgeBuilds,
  updateKnowledgeSourceMetadata
} from '../../utils/knowledge/catalog'
import {
  importKnowledgeFiles,
  inferKnowledgeFileType,
  KnowledgeImportError
} from '../../utils/knowledge/import-files'
import { KnowledgeCsvError } from '../../utils/knowledge/ingest-files'
import { inspectWorkbook, KnowledgeUploadError } from '../../utils/knowledge/parse-upload'
import { listKnowledgeProfiles } from '../../utils/knowledge/profiles'

export const MAX_KNOWLEDGE_UPLOAD_BYTES = 100 * 1024 * 1024

const PatchSourceBody = z
  .object({
    title: z.string().trim().min(1),
    profileIds: KnowledgeProfileIdsSchema,
    moduleIds: KnowledgeModuleIdsSchema,
    updatedAt: z.iso.datetime()
  })
  .strict()

const WorkbookSheetConfigSchema = z
  .object({
    sheetName: z.string().trim().min(1),
    headerRow: z.number().int().positive(),
    title: z.string().trim().min(1)
  })
  .strict()

const apiError = (c: AuthContext, status: 400 | 404 | 409 | 500, code: string, message: string) =>
  c.json({ error: { code, message } }, status)

const requester = (c: AuthContext): string | null => c.get('user')?.email ?? null

export const toKnowledgeSourceDto = (source: KnowledgeSource): KnowledgeSourceDto => ({
  ...source,
  coreDataTable: coreDataContractForFilename(source.originalName)?.table ?? null
})

export const getKnowledge = async (c: AuthContext) => {
  const profiles = await listKnowledgeProfiles()
  const builds = listKnowledgeBuilds()
  const snapshot = getKnowledgeCatalogSnapshot()
  const lastSuccessfulBuild = builds.find(({ status }) => status === 'succeeded')
  const hasPublishableSources = snapshot.sources.some(
    (source) =>
      isKnowledgeSourceAssigned(source) || coreDataContractForFilename(source.originalName) !== null
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

export const postInspectKnowledgeWorkbook = async (c: AuthContext) => {
  try {
    const body = await c.req.parseBody()
    const rawFile = body['file']
    if (!(rawFile instanceof File)) {
      return apiError(c, 400, 'missing_file', 'Aucun fichier fourni.')
    }
    if (inferKnowledgeFileType(rawFile.name) !== 'xlsx') {
      return apiError(c, 400, 'unsupported_file', `Format non pris en charge : ${rawFile.name}`)
    }
    const rawMaxRows = typeof body['maxRows'] === 'string' ? Number(body['maxRows']) : undefined
    const maxRows =
      rawMaxRows !== undefined && Number.isInteger(rawMaxRows) && rawMaxRows > 0
        ? rawMaxRows
        : undefined
    const originalName = rawFile.name.normalize('NFC')
    const bytes = new Uint8Array(await rawFile.arrayBuffer())
    const sheets = inspectWorkbook(bytes, { maxRows, filename: originalName })
    return c.json({ data: { originalName, sheets } })
  } catch (error) {
    if (error instanceof KnowledgeUploadError) {
      return apiError(c, 400, error.code, error.message)
    }
    console.error(error)
    return apiError(c, 500, 'inspect_failed', 'Impossible d’inspecter le classeur.')
  }
}

const parseSheetConfig = (raw: unknown): WorkbookSheetConfig | undefined | 'invalid' => {
  if (raw === undefined || raw === '') return undefined
  if (typeof raw !== 'string') return 'invalid'
  try {
    const parsed = WorkbookSheetConfigSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : 'invalid'
  } catch {
    return 'invalid'
  }
}

export const postKnowledgeSources = async (c: AuthContext) => {
  try {
    const origin = c.req.header('authorization')?.startsWith('Bearer ') ? 'cli' : 'ui'
    const body = await c.req.parseBody({ all: true })
    const rawFiles = body['files[]'] ?? body['files']
    const files = (Array.isArray(rawFiles) ? rawFiles : [rawFiles]).filter(
      (value): value is File => value instanceof File
    )
    const rawSheet = Array.isArray(body['sheet']) ? body['sheet'][0] : body['sheet']
    const sheet = parseSheetConfig(rawSheet)
    if (sheet === 'invalid') {
      return apiError(c, 400, 'invalid_config', 'Configuration d’import invalide.')
    }
    const { sources, shouldBuild } = await importKnowledgeFiles(files, origin, sheet)
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

export const patchKnowledgeSource = async (c: AuthContext) => {
  const id = c.req.param('id')
  if (!id) return apiError(c, 404, 'source_not_found', 'Source introuvable.')
  const previous = getKnowledgeSource(id)
  if (!previous) return apiError(c, 404, 'source_not_found', 'Source introuvable.')
  const parsed = PatchSourceBody.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return apiError(c, 400, 'invalid_source', 'Configuration invalide.')
  if (
    previous.title === parsed.data.title &&
    JSON.stringify(previous.profileIds) === JSON.stringify(parsed.data.profileIds) &&
    JSON.stringify(previous.moduleIds) === JSON.stringify(parsed.data.moduleIds)
  ) {
    return c.json({ data: { source: toKnowledgeSourceDto(previous) } })
  }

  try {
    const profiles = await listKnowledgeProfiles()
    const source = updateKnowledgeSourceMetadata(
      id,
      {
        title: parsed.data.title,
        profileIds: parsed.data.profileIds,
        moduleIds: parsed.data.moduleIds
      },
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

export const deleteKnowledgeSourceController = async (c: AuthContext) => {
  const id = c.req.param('id')
  if (!id) return apiError(c, 404, 'source_not_found', 'Source introuvable.')
  const source = getKnowledgeSource(id)
  if (!source) return apiError(c, 404, 'source_not_found', 'Source introuvable.')

  try {
    deleteKnowledgeSource(source.id)
  } catch {
    return apiError(c, 500, 'delete_failed', 'La source ne peut pas être supprimée.')
  }
  return c.json({ data: { id: source.id } })
}

export const getKnowledgeBuilds = (c: AuthContext) =>
  c.json({ data: { builds: listKnowledgeBuilds() } })

export const postKnowledgeBuild = (c: AuthContext) => {
  const build = requestKnowledgeBuild('manual', requester(c))
  return c.json({ data: { build } }, 202)
}
