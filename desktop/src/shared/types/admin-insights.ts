import type {
  ConversationDetail,
  ConversationListQuery,
  ConversationSummary,
  SaveConversationReview
} from '../../../../shared/admin-conversations'
import type {
  LlmRun,
  LlmRunSummary,
  LlmUsageSummary,
  UsagePeriod
} from '../../../../shared/llm-usage'

export type {
  ConversationDetail,
  ConversationReview,
  ConversationSummary,
  ReviewCategory,
  ReviewStatus,
  SaveConversationReview
} from '../../../../shared/admin-conversations'
export {
  CONVERSATION_PAGE_SIZE,
  REVIEW_CATEGORIES,
  REVIEW_CATEGORY_LABELS,
  REVIEW_STATUSES,
  REVIEW_STATUS_LABELS
} from '../../../../shared/admin-conversations'
export type {
  LlmRun,
  LlmRunSummary,
  LlmUsageSummary,
  UsagePeriod
} from '../../../../shared/llm-usage'
export {
  LLM_OPERATION_LABELS,
  LLM_PAGE_SIZE,
  LLM_RUN_STATUS_LABELS,
  USAGE_PERIOD_LABELS,
  USAGE_PERIODS
} from '../../../../shared/llm-usage'

export type AdminError = { error: { code?: string; message: string } }
export type ConversationListResponse = {
  data: { conversations: ConversationSummary[]; total: number; chatbots: string[] }
}
export type ConversationDetailResponse = { data: ConversationDetail }
export type LlmUsageResponse = { data: LlmUsageSummary }
export type LlmRunListResponse = { data: { runs: LlmRunSummary[]; total: number } }
export type LlmRunResponse = { data: LlmRun }

export type ListAdminConversationsParams = { url: string } & ConversationListQuery
export type GetAdminConversationParams = { url: string; convId: string }
export type SaveAdminConversationReviewParams = {
  url: string
  convId: string
} & SaveConversationReview
export type GetLlmUsageParams = { url: string; period: UsagePeriod }
export type ListLlmRunsParams = { url: string; period: UsagePeriod; offset?: number }
export type GetLlmRunParams = { url: string; id: string }
