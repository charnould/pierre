import { z } from 'zod/v4'

import { type BusinessModuleId, isBusinessModuleId } from '../../../shared/modules'
import {
  type KnowledgeBuildDocument,
  KnowledgeBuildDocumentSchema,
  type KnowledgeSourceDocument,
  KnowledgeSourceDocumentSchema
} from './catalog-schema'

const StoredSourceSchema = z
  .object({
    original_name: z.string(),
    file_type: z.enum(['csv', 'md', 'docx', 'xlsx', 'intake']),
    size_bytes: z.number(),
    content_hash: z.string().nullable(),
    origin: z.enum(['ui', 'cli']),
    title: z.string(),
    description: z.string().nullable().optional(),
    sheet_name: z.string().nullable(),
    header_row: z.number().int().positive().nullable(),
    header_hash: z.string().nullable(),
    profile_ids: z.array(z.string()),
    module_ids: z.array(z.custom<BusinessModuleId>(isBusinessModuleId))
  })
  .strict()

const StoredDiagnosticSchema = z
  .object({
    level: z.enum(['info', 'warning', 'error']),
    code: z.string(),
    message: z.string(),
    subject: z.string().nullable()
  })
  .strict()

const StoredBuildSchema = z
  .object({
    status: z.enum(['queued', 'running', 'succeeded', 'failed']),
    trigger: z.enum([
      'startup',
      'cron',
      'upload',
      'patch',
      'delete',
      'manual',
      'chatbot',
      'intake'
    ]),
    requested_by: z.string().nullable(),
    catalog_fingerprint: z.string().nullable(),
    started_at: z.string().nullable(),
    finished_at: z.string().nullable(),
    core_fingerprint: z.string().nullable(),
    owner_id: z.string(),
    heartbeat_at: z.string(),
    items: z.array(
      z
        .object({
          key: z.string(),
          status: z.enum(['succeeded', 'failed'])
        })
        .strict()
    ),
    diagnostics: z.array(StoredDiagnosticSchema)
  })
  .strict()

const storedSourceDocument = (document: KnowledgeSourceDocument) =>
  StoredSourceSchema.parse({
    original_name: document.originalName,
    file_type: document.fileType,
    size_bytes: document.sizeBytes,
    content_hash: document.contentHash,
    origin: document.origin,
    title: document.title,
    ...(document.description ? { description: document.description } : {}),
    sheet_name: document.sheetName,
    header_row: document.headerRow,
    header_hash: document.headerHash,
    profile_ids: document.profileIds,
    module_ids: document.moduleIds
  })

export const parseStoredSourceDocument = (raw: unknown): KnowledgeSourceDocument => {
  const stored = StoredSourceSchema.parse(raw)
  return KnowledgeSourceDocumentSchema.parse({
    originalName: stored.original_name,
    fileType: stored.file_type,
    sizeBytes: stored.size_bytes,
    contentHash: stored.content_hash,
    origin: stored.origin,
    title: stored.title,
    ...(stored.description ? { description: stored.description } : {}),
    sheetName: stored.sheet_name,
    headerRow: stored.header_row,
    headerHash: stored.header_hash,
    profileIds: stored.profile_ids,
    moduleIds: stored.module_ids
  })
}

const storedBuildDocument = (document: KnowledgeBuildDocument) =>
  StoredBuildSchema.parse({
    status: document.status,
    trigger: document.trigger,
    requested_by: document.requestedBy,
    catalog_fingerprint: document.catalogFingerprint,
    started_at: document.startedAt,
    finished_at: document.finishedAt,
    core_fingerprint: document.coreFingerprint,
    owner_id: document.ownerId,
    heartbeat_at: document.heartbeatAt,
    items: document.items,
    diagnostics: document.diagnostics
  })

export const parseStoredBuildDocument = (raw: unknown): KnowledgeBuildDocument => {
  const stored = StoredBuildSchema.parse(raw)
  return KnowledgeBuildDocumentSchema.parse({
    status: stored.status,
    trigger: stored.trigger,
    requestedBy: stored.requested_by,
    catalogFingerprint: stored.catalog_fingerprint,
    startedAt: stored.started_at,
    finishedAt: stored.finished_at,
    coreFingerprint: stored.core_fingerprint,
    ownerId: stored.owner_id,
    heartbeatAt: stored.heartbeat_at,
    items: stored.items,
    diagnostics: stored.diagnostics
  })
}

export const stringifyStoredSourceDocument = (document: KnowledgeSourceDocument): string =>
  JSON.stringify(storedSourceDocument(document))

export const stringifyStoredBuildDocument = (document: KnowledgeBuildDocument): string =>
  JSON.stringify(storedBuildDocument(document))
