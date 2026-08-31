export type {
  BulkExecutionMode,
  BulkItemReportStatus,
  BulkMedium,
  BulkOperationDefinition,
  BulkOperationRecord,
  BulkOperationSummary,
  BulkReportDetail,
  BulkReportItem,
  BulkReportSummary,
  BulkRunReportStatus,
  BulkRichRcsNode,
  BulkSource,
  PreviewMessageResult,
  PreviewQueryResult,
  PreviewRow,
  PreviewStepReason,
  SimpleDeliveryStep
} from '../../../../shared/bulk-operations'

export {
  BULK_MEDIA,
  bulkDeliveryError,
  collectBulkPlaceholders,
  emptyBulkOperationDefinition,
  lastBulkOperationEdit
} from '../../../../shared/bulk-operations'
export { collect_rich_rcs_replies, rich_rcs_graph_issues } from '../../../../shared/bulk-rich-rcs'

import type {
  BulkOperationDefinition,
  BulkOperationExecuteResult,
  BulkOperationRecord,
  BulkOperationSummary,
  BulkReportDetail,
  CreateBulkOperationBody,
  PatchBulkOperationBody,
  PreviewMessageResult,
  PreviewQueryResult
} from '../../../../shared/bulk-operations'

export type BulkOperationsListResponse = { data: BulkOperationSummary[] }
export type BulkOperationResponse = { data: BulkOperationRecord }
export type BulkOperationPreviewQueryResponse = { data: PreviewQueryResult }
export type BulkOperationPreviewMessageResponse = { data: PreviewMessageResult }
export type BulkOperationExecuteResponse = { data: BulkOperationExecuteResult }
export type BulkOperationReportsResponse = { data: BulkReportDetail[] }

export type ListBulkOperationsParams = { url: string }
export type GetBulkOperationParams = { url: string; id: string }
export type CreateBulkOperationPayload = { url: string } & CreateBulkOperationBody
export type PatchBulkOperationPayload = {
  url: string
  id: string
  patch: PatchBulkOperationBody
}
export type DeleteBulkOperationPayload = { url: string; id: string }
export type ListBulkOperationReportsParams = { url: string; id: string }
export type ExecuteBulkOperationPayload = {
  url: string
  id: string
  mode: 'send' | 'apply_without_send'
  clientCommandId: string
}
export type PreviewBulkOperationQueryPayload = {
  url: string
  definition: BulkOperationDefinition
  bulkOperationId?: string
}
export type PreviewBulkOperationMessagePayload = PreviewBulkOperationQueryPayload & {
  id_locataire: string
  nodeId?: string
}
