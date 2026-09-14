import { basename } from 'node:path'

import { z } from 'zod/v4'

import { DATASTORE_TABLES, type DatastoreTable } from '../../../shared/core-data'
import { isBusinessModuleId, type BusinessModuleId } from '../../../shared/modules'

export const KnowledgeEntrySchema = z
  .object({
    title: z.string().trim().min(1),
    sheet: z.number().int().nonnegative().nullable(),
    sheetName: z.string().trim().min(1).nullable().default(null),
    headerRow: z.number().int().nonnegative().nullable(),
    url: z.unknown().optional(),
    profileIds: z
      .array(z.string().trim().min(1))
      .refine((ids) => new Set(ids).size === ids.length, {
        message: 'Duplicate profile'
      }),
    moduleIds: z
      .array(z.custom<BusinessModuleId>(isBusinessModuleId))
      .default([])
      .refine((ids) => new Set(ids).size === ids.length, {
        message: 'Duplicate module'
      })
  })
  .strict()
  .transform(({ url: _url, ...entry }) => entry)

export const KnowledgeSourceDocumentSchema = z
  .object({
    storageName: z
      .string()
      .trim()
      .min(1)
      .refine((name) => name === basename(name), { message: 'Invalid storage name' }),
    originalName: z.string().trim().min(1),
    fileType: z.enum(['csv', 'md', 'docx', 'xlsx']),
    sizeBytes: z.number().int().nonnegative(),
    contentHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable()
      .default(null),
    origin: z.enum(['ui', 'cli']),
    entries: z.array(KnowledgeEntrySchema)
  })
  .strict()
  .superRefine((source, context) => {
    if (source.fileType !== 'xlsx' && source.entries.length > 1) {
      context.addIssue({
        code: 'custom',
        path: ['entries'],
        message: 'Text sources have one entry'
      })
    }
    const sheets = new Set<number>()
    const sheetNames = new Set<string>()
    for (const [index, entry] of source.entries.entries()) {
      const hasSpreadsheetCoordinates =
        entry.sheet !== null && entry.sheetName !== null && entry.headerRow !== null
      if (source.fileType === 'xlsx' && !hasSpreadsheetCoordinates) {
        context.addIssue({
          code: 'custom',
          path: ['entries', index],
          message: 'Spreadsheet entries require sheet and headerRow'
        })
      }
      if (source.fileType === 'xlsx' && entry.sheet !== null) {
        if (sheets.has(entry.sheet)) {
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'sheet'],
            message: 'Spreadsheet sheets can only be selected once'
          })
        }
        sheets.add(entry.sheet)
      }
      if (source.fileType === 'xlsx' && entry.sheetName !== null) {
        const normalized = entry.sheetName.toLocaleLowerCase('fr')
        if (sheetNames.has(normalized)) {
          context.addIssue({
            code: 'custom',
            path: ['entries', index, 'sheetName'],
            message: 'Spreadsheet sheet names can only be selected once'
          })
        }
        sheetNames.add(normalized)
      }
      if (
        source.fileType !== 'xlsx' &&
        (entry.sheet !== null || entry.sheetName !== null || entry.headerRow !== null)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['entries', index],
          message: 'Text entries cannot select a sheet'
        })
      }
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

const isDatastoreTable = (value: unknown): value is DatastoreTable =>
  (DATASTORE_TABLES as readonly string[]).includes(String(value))

export const KnowledgeBuildDocumentSchema = z
  .object({
    status: z.enum(['queued', 'running', 'succeeded', 'failed']),
    trigger: z.enum(['startup', 'cron', 'upload', 'patch', 'delete', 'manual']),
    requestedBy: z.string().trim().min(1).nullable(),
    catalogFingerprint: z.string().nullable().default(null),
    startedAt: z.iso.datetime().nullable(),
    finishedAt: z.iso.datetime().nullable(),
    mirrorTables: z.array(z.custom<DatastoreTable>(isDatastoreTable)),
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

export type KnowledgeEntry = z.infer<typeof KnowledgeEntrySchema>
export type KnowledgeEntryInput = z.input<typeof KnowledgeEntrySchema>
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

export type KnowledgeIngestionEntry = {
  filepath: string
  access: string
  sheet: number
  headers: number
  filename: string
  agent_filename: string
  type: 'csv' | 'md' | 'docx' | 'xlsx'
  coreDataTable: DatastoreTable | null
}

export type KnowledgeCatalogSnapshot = {
  sources: KnowledgeSource[]
  fingerprint: string
}

export const isReservedCoreDataTitle = (title: string): boolean =>
  (DATASTORE_TABLES as readonly string[]).includes(title)
