import { z } from 'zod'

import {
  BULK_SOURCES,
  type BulkOperationExecuteResult,
  type BulkReportCounts,
  type BulkRunReportStatus
} from '../../../shared/bulk-operations'

const ValuesSchema = z
  .object({
    execution_id: z.string().min(1),
    client_command_id: z.string().min(1),
    source: z.enum(BULK_SOURCES),
    mode: z.enum(['send', 'apply_without_send']),
    total: z.number().int().nonnegative(),
    queued: z.number().int().nonnegative(),
    no_usable_route: z.number().int().nonnegative(),
    applied: z.number().int().nonnegative()
  })
  .strict()

const BulkRunContentSchema = z
  .object({
    version: z.literal(2),
    title: z.string().min(1),
    values: ValuesSchema
  })
  .strict()

export type BulkRunContent = z.infer<typeof BulkRunContentSchema>

const BulkRunSummaryContentSchema = z
  .object({
    version: z.literal(2),
    title: z.string().min(1),
    values: z
      .object({
        execution_id: z.string().min(1),
        report_status: z.enum(['ok', 'ko', 'partial']),
        count_in_progress: z.literal(0),
        count_ok: z.number().int().nonnegative(),
        count_ko: z.number().int().nonnegative(),
        completed_at: z.iso.datetime()
      })
      .strict()
  })
  .strict()

export type BulkRunSummaryContent = z.infer<typeof BulkRunSummaryContentSchema>

export const parseBulkRunContent = (raw: string): BulkRunContent =>
  BulkRunContentSchema.parse(JSON.parse(raw))

export const stringifyBulkRunContent = (content: BulkRunContent): string =>
  JSON.stringify(BulkRunContentSchema.parse(content))

export const parseBulkRunSummaryContent = (raw: string): BulkRunSummaryContent =>
  BulkRunSummaryContentSchema.parse(JSON.parse(raw))

export const stringifyBulkRunSummaryContent = (content: BulkRunSummaryContent): string =>
  JSON.stringify(BulkRunSummaryContentSchema.parse(content))

export const bulkRunResult = (content: BulkRunContent): BulkOperationExecuteResult => ({
  executionId: content.values.execution_id,
  totals: {
    total: content.values.total,
    queued: content.values.queued,
    noUsableRoute: content.values.no_usable_route,
    applied: content.values.applied
  }
})

export const bulkRunSummary = (
  content: BulkRunSummaryContent
): { status: BulkRunReportStatus; counts: BulkReportCounts; completedAt: string } => {
  const values = content.values
  return {
    status: values.report_status,
    counts: {
      total: values.count_in_progress + values.count_ok + values.count_ko,
      inProgress: values.count_in_progress,
      ok: values.count_ok,
      ko: values.count_ko
    },
    completedAt: values.completed_at
  }
}
