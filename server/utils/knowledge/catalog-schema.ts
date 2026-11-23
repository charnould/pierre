import { basename } from 'node:path'

import { z } from 'zod/v4'

import { DATASTORE_TABLES, type DatastoreTable } from '../../../shared/core-data'
import { type BusinessModuleId, isBusinessModuleId } from '../../../shared/modules'

const Sha256Hex = z.string().regex(/^[a-f0-9]{64}$/)

export const KnowledgeProfileIdsSchema = z
  .array(z.string().trim().min(1))
  .refine((ids) => new Set(ids).size === ids.length, {
    message: 'Duplicate profile'
  })

export const KnowledgeModuleIdsSchema = z
  .array(z.custom<BusinessModuleId>(isBusinessModuleId))
  .default([])
  .refine((ids) => new Set(ids).size === ids.length, {
    message: 'Duplicate module'
  })

export const KnowledgeSourceDocumentSchema = z
  .object({
    originalName: z
      .string()
      .trim()
      .min(1)
      .refine((name) => name === basename(name), { message: 'Invalid filename' }),
    fileType: z.enum(['csv', 'md', 'docx', 'xlsx', 'intake']),
    sizeBytes: z.number().int().nonnegative(),
    contentHash: Sha256Hex.nullable().default(null),
    origin: z.enum(['ui', 'cli']),
    title: z.string().trim().min(1),
    description: z.string().trim().min(1).nullable().optional(),
    sheetName: z.string().trim().min(1).nullable().default(null),
    headerRow: z.number().int().positive().nullable().default(null),
    headerHash: Sha256Hex.nullable().default(null),
    profileIds: KnowledgeProfileIdsSchema,
    moduleIds: KnowledgeModuleIdsSchema
  })
  .strict()
  .superRefine((source, context) => {
    if (source.fileType === 'xlsx') {
      if (source.sheetName === null || source.headerRow === null || source.headerHash === null) {
        context.addIssue({
          code: 'custom',
          path: ['sheetName'],
          message: 'Spreadsheet sources require sheetName, headerRow and headerHash'
        })
      }
      return
    }
    if (source.sheetName !== null || source.headerRow !== null || source.headerHash !== null) {
      context.addIssue({
        code: 'custom',
        path: ['sheetName'],
        message: 'Non-spreadsheet sources cannot set spreadsheet fields'
      })
    }
  })

const KnowledgeDiagnosticSchema = z
  .object({
    level: z.enum(['info', 'warning', 'error']),
    code: z.string().trim().min(1),
    message: z.string().trim().min(1),
    subject: z.string().trim().min(1).nullable()
  })
  .strict()

export const KnowledgeBuildDocumentSchema = z
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
    requestedBy: z.string().trim().min(1).nullable(),
    catalogFingerprint: z.string().nullable().default(null),
    startedAt: z.iso.datetime().nullable(),
    finishedAt: z.iso.datetime().nullable(),
    coreFingerprint: z.string().nullable().default(null),
    ownerId: z.string().trim().min(1),
    heartbeatAt: z.iso.datetime(),
    items: z
      .array(
        z
          .object({
            key: z.string().min(1),
            status: z.enum(['succeeded', 'failed'])
          })
          .strict()
      )
      .default([]),
    diagnostics: z.array(KnowledgeDiagnosticSchema)
  })
  .strict()

export type KnowledgeSourceDocument = z.infer<typeof KnowledgeSourceDocumentSchema>
export type KnowledgeSourceDocumentInput = z.input<typeof KnowledgeSourceDocumentSchema>
export type KnowledgeBuildDocument = z.infer<typeof KnowledgeBuildDocumentSchema>
export type KnowledgeDiagnostic = z.infer<typeof KnowledgeDiagnosticSchema>
export type KnowledgeBuildTrigger = KnowledgeBuildDocument['trigger']

export type KnowledgeSource = KnowledgeSourceDocument & {
  id: string
  createdAt: string
  updatedAt: string
}

export type KnowledgeBuild = KnowledgeBuildDocument & {
  id: string
  createdAt: string
  updatedAt: string
}

export type KnowledgeProjection = {
  sourceId: string
  outputName: string
  access: string
  title: string
  description: string | null
  fileType: 'csv' | 'md' | 'docx' | 'xlsx' | 'intake'
  contentHash: string | null
  headerRow: number | null
  headerHash: string | null
  coreDataTable: DatastoreTable | null
}

export type KnowledgeCatalogSnapshot = {
  sources: KnowledgeSource[]
  fingerprint: string
}

export const isReservedCoreDataTitle = (title: string): boolean =>
  (DATASTORE_TABLES as readonly string[]).includes(title)
