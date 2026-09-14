import type { DatastoreTable } from './core-data'
import type { BusinessModuleId } from './modules'

export type KnowledgeEntry = {
  title: string
  sheet: number | null
  sheetName: string | null
  headerRow: number | null
  profileIds: string[]
  moduleIds: BusinessModuleId[]
}

export type KnowledgeSource = {
  id: string
  storageName: string
  originalName: string
  fileType: 'csv' | 'md' | 'docx' | 'xlsx'
  sizeBytes: number
  contentHash: string | null
  origin: 'ui' | 'cli'
  entries: KnowledgeEntry[]
  itemKeys: string[]
  coreDataEntries: Array<{ index: number; table: DatastoreTable }>
  createdAt: string
  updatedAt: string
}

type KnowledgeDiagnostic = {
  level: 'info' | 'warning' | 'error'
  code: string
  message: string
  subject: string | null
}

export type KnowledgeBuild = {
  id: string
  status: 'queued' | 'running' | 'succeeded' | 'failed'
  trigger: 'startup' | 'cron' | 'upload' | 'patch' | 'delete' | 'manual'
  requestedBy: string | null
  catalogFingerprint: string | null
  startedAt: string | null
  finishedAt: string | null
  mirrorTables: DatastoreTable[]
  ownerId: string
  heartbeatAt: string
  items: Array<{ key: string; status: 'succeeded' | 'failed' }>
  diagnostics: KnowledgeDiagnostic[]
  createdAt: string
  updatedAt: string
}

export type KnowledgeProfile = {
  id: string
  label: string
  kind: 'chatbot' | 'skill'
  communityKnowledge: boolean
}

export type KnowledgeData = {
  sources: KnowledgeSource[]
  profiles: KnowledgeProfile[]
  coreDataTables: Array<{ table: DatastoreTable; filename: string; label: string }>
  lastBuild: KnowledgeBuild | null
  needsRebuild: boolean
}

type KnowledgeApiError = {
  error: {
    code: string
    message: string
  }
}

export type KnowledgeResponse = { data: KnowledgeData } | KnowledgeApiError
export type KnowledgeBuildsResponse = { data: { builds: KnowledgeBuild[] } } | KnowledgeApiError
export type KnowledgeBuildResponse = { data: { build: KnowledgeBuild } } | KnowledgeApiError
export type KnowledgeSourceResponse = { data: { source: KnowledgeSource } } | KnowledgeApiError
export type KnowledgeUploadResponse =
  | {
      data: {
        sources: Array<{
          source: KnowledgeSource
          changed: boolean
        }>
      }
    }
  | KnowledgeApiError

export const isKnowledgeEntryAssigned = (
  entry: Pick<KnowledgeEntry, 'profileIds' | 'moduleIds'>
): boolean => entry.profileIds.length > 0 || entry.moduleIds.length > 0

/**
 * Normalizes knowledge labels, filenames, table names, and column names to
 * lowercase ASCII `snake_case`.
 *
 * When `preserve_extension` is enabled, only the filename stem is normalized
 * and the last extension segment is kept unchanged. Use that mode for real
 * files (`rapport final.md` → `rapport_final.md`); keep the default for labels
 * and SQL identifiers (`Nom complet` → `nom_complet`).
 */
export const normalize_knowledge_name = (
  value: string,
  options: { preserve_extension?: boolean } = {}
): string => {
  const last_dot_index = options.preserve_extension === true ? value.lastIndexOf('.') : -1
  const extension = last_dot_index > 0 ? value.slice(last_dot_index) : ''
  const stem = last_dot_index > 0 ? value.slice(0, last_dot_index) : value

  const normalized_stem = stem
    .normalize('NFC')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized_stem + extension
}
