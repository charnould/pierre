export const REVIEW_STATUSES = ['reviewed', 'action_required', 'resolved'] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

export const REVIEW_CATEGORIES = [
  'knowledge_gap',
  'incorrect',
  'incomplete',
  'off_topic',
  'unclear',
  'ambiguous_prompt',
  'tool_failure',
  'other'
] as const
export type ReviewCategory = (typeof REVIEW_CATEGORIES)[number]

export const REVIEW_STATUS_LABELS: Record<ReviewStatus | 'unreviewed', string> = {
  unreviewed: 'Non revue',
  reviewed: 'Revue',
  action_required: 'Action requise',
  resolved: 'Résolue'
}

export const REVIEW_CATEGORY_LABELS: Record<ReviewCategory, string> = {
  knowledge_gap: 'Lacune de connaissance',
  incorrect: 'Réponse incorrecte',
  incomplete: 'Réponse incomplète',
  off_topic: 'Hors sujet',
  unclear: 'Manque de clarté',
  ambiguous_prompt: 'Prompt ambigu',
  tool_failure: 'Échec d’outil',
  other: 'Autre'
}

export type ConversationMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  createdAt: string
  content: string
}

export type ConversationComment = {
  id: string
  author: string
  body: string
  createdAt: string
}

export type ConversationReview = {
  status: ReviewStatus
  score: number | null
  categories: ReviewCategory[]
  updatedBy: string
  updatedAt: string
  comments: ConversationComment[]
}

export type ConversationSummary = {
  convId: string
  configId: string
  userEmail: string | null
  startedAt: string
  updatedAt: string
  messageCount: number
  preview: string
  reviewStatus: ReviewStatus | null
  reviewScore: number | null
}

export type ConversationDetail = {
  convId: string
  configId: string
  userEmail: string | null
  startedAt: string
  updatedAt: string
  messages: ConversationMessage[]
  review: ConversationReview | null
}

export type ConversationListQuery = {
  q?: string
  reviewStatus?: ReviewStatus | 'unreviewed'
  audience?: 'public' | 'collaborator'
  chatbot?: string
  offset?: number
}

export type SaveConversationReview = {
  expectedUpdatedAt: string | null
  status: ReviewStatus
  score: number | null
  categories: ReviewCategory[]
  comment?: string
}

export const CONVERSATION_PAGE_SIZE = 50
