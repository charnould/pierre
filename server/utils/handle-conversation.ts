import {
  CONVERSATION_PAGE_SIZE,
  type ConversationDetail,
  type ConversationListQuery,
  type ConversationMessage,
  type ConversationReview,
  type ConversationSummary,
  REVIEW_CATEGORIES,
  REVIEW_STATUSES,
  type ReviewCategory,
  type ReviewStatus,
  type SaveConversationReview
} from '../../shared/admin-conversations'
import type { AIContext } from './_schema'
import { openDatastore } from './datastore-db'

type ConversationRow = {
  conv_id: string
  config_id: string
  user_email: string | null
  started_at: string
  updated_at: string
  messages: string
  review: string | null
}

type SummaryRow = {
  conv_id: string
  config_id: string
  user_email: string | null
  started_at: string
  updated_at: string
  message_count: number
  preview: string | null
  review_status: string | null
  review_score: number | null
}

const reviewStatus = (value: string | null): ReviewStatus | null =>
  REVIEW_STATUSES.find((status) => status === value) ?? null

const categories = (value: unknown): ReviewCategory[] =>
  Array.isArray(value)
    ? value.filter((item): item is ReviewCategory =>
        REVIEW_CATEGORIES.some((category) => category === item)
      )
    : []

export const parseReview = (value: string | null): ConversationReview | null => {
  if (!value) return null
  const parsed = JSON.parse(value) as Partial<ConversationReview>
  const status = reviewStatus(parsed.status ?? null)
  if (!status) return null
  return {
    status,
    score: typeof parsed.score === 'number' ? parsed.score : null,
    categories: categories(parsed.categories),
    updatedBy: parsed.updatedBy ?? '',
    updatedAt: parsed.updatedAt ?? '',
    comments: Array.isArray(parsed.comments) ? parsed.comments : []
  }
}

const parseMessages = (value: string): ConversationMessage[] => {
  const parsed = JSON.parse(value) as ConversationMessage[]
  return Array.isArray(parsed) ? parsed : []
}

const detail = (row: ConversationRow): ConversationDetail => ({
  convId: row.conv_id,
  configId: row.config_id,
  userEmail: row.user_email,
  startedAt: row.started_at,
  updatedAt: row.updated_at,
  messages: parseMessages(row.messages),
  review: parseReview(row.review)
})

export const save_reply = async (context: AIContext): Promise<void> => {
  if (typeof context.config === 'string') return
  const now = new Date().toISOString()
  const message = JSON.stringify({
    id: Bun.randomUUIDv7(),
    role: context.role,
    createdAt: now,
    content: context.content
  })
  using db = openDatastore()
  db.run(
    `INSERT INTO conversations (
       conv_id, config_id, user_email, started_at, updated_at, messages, review
     ) VALUES (?, ?, ?, ?, ?, json_array(json(?)), NULL)
     ON CONFLICT(conv_id) DO UPDATE SET
       messages = json_insert(conversations.messages, '$[#]', json(?)),
       updated_at = ?,
       user_email = COALESCE(conversations.user_email, ?)`,
    [
      context.conv_id,
      context.config.id,
      context.user_email ?? null,
      now,
      now,
      message,
      message,
      now,
      context.user_email ?? null
    ]
  )
}

const filters = (query: ConversationListQuery) => {
  const where: string[] = []
  const values: Array<string | number> = []
  const search = query.q?.trim()
  if (search) {
    where.push(`(
      COALESCE(user_email, '') LIKE '%' || ? || '%' COLLATE NOCASE
      OR EXISTS (
        SELECT 1 FROM json_each(messages)
        WHERE json_extract(value, '$.content') LIKE '%' || ? || '%' COLLATE NOCASE
      )
    )`)
    values.push(search, search)
  }
  if (query.reviewStatus === 'unreviewed') where.push('review IS NULL')
  else if (query.reviewStatus) {
    where.push(`json_extract(review, '$.status') = ?`)
    values.push(query.reviewStatus)
  }
  if (query.audience === 'public') where.push('user_email IS NULL')
  if (query.audience === 'collaborator') where.push('user_email IS NOT NULL')
  if (query.chatbot) {
    where.push('config_id = ?')
    values.push(query.chatbot)
  }
  return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', values }
}

export const list_conversations = (
  query: ConversationListQuery
): { conversations: ConversationSummary[]; total: number; chatbots: string[] } => {
  using db = openDatastore()
  const { clause, values } = filters(query)
  const offset = Math.max(0, query.offset ?? 0)
  const total =
    db
      .query<{ total: number }, Array<string | number>>(
        `SELECT COUNT(*) AS total FROM conversations ${clause}`
      )
      .get(...values)?.total ?? 0
  const rows = db
    .query<SummaryRow, Array<string | number>>(
      `SELECT conv_id, config_id, user_email, started_at, updated_at,
              json_array_length(messages) AS message_count,
              (
                SELECT json_extract(value, '$.content') FROM json_each(messages)
                WHERE json_extract(value, '$.role') = 'user'
                LIMIT 1
              ) AS preview,
              json_extract(review, '$.status') AS review_status,
              json_extract(review, '$.score') AS review_score
       FROM conversations
       ${clause}
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...values, CONVERSATION_PAGE_SIZE, offset)
  const chatbots = db
    .query<{ config_id: string }, []>(
      'SELECT DISTINCT config_id FROM conversations ORDER BY config_id'
    )
    .all()
    .map((row) => row.config_id)
  return {
    total,
    chatbots,
    conversations: rows.map((row) => ({
      convId: row.conv_id,
      configId: row.config_id,
      userEmail: row.user_email,
      startedAt: row.started_at,
      updatedAt: row.updated_at,
      messageCount: row.message_count,
      preview: row.preview ?? '',
      reviewStatus: reviewStatus(row.review_status),
      reviewScore: typeof row.review_score === 'number' ? row.review_score : null
    }))
  }
}

export const get_conversation = (convId: string): ConversationDetail | null => {
  using db = openDatastore()
  const row = db
    .query<ConversationRow, [string]>(
      `SELECT conv_id, config_id, user_email, started_at, updated_at, messages, review
       FROM conversations WHERE conv_id = ?`
    )
    .get(convId)
  return row ? detail(row) : null
}

export const save_conversation_review = (
  convId: string,
  author: string,
  input: SaveConversationReview
): 'missing' | 'conflict' | ConversationDetail => {
  const current = get_conversation(convId)
  if (!current) return 'missing'
  if ((current.review?.updatedAt ?? null) !== input.expectedUpdatedAt) return 'conflict'
  const now = new Date().toISOString()
  const comment = input.comment?.trim()
  const review: ConversationReview = {
    status: input.status,
    score: input.score,
    categories: input.categories,
    updatedBy: author,
    updatedAt: now,
    comments: [
      ...(current.review?.comments ?? []),
      ...(comment ? [{ id: Bun.randomUUIDv7(), author, body: comment, createdAt: now }] : [])
    ]
  }
  using db = openDatastore()
  const saved = db.run(
    `UPDATE conversations
     SET review = ?
     WHERE conv_id = ?
       AND (
         (? IS NULL AND review IS NULL)
         OR json_extract(review, '$.updatedAt') = ?
       )`,
    [JSON.stringify(review), convId, input.expectedUpdatedAt, input.expectedUpdatedAt]
  )
  if (saved.changes === 0) return 'conflict'
  return get_conversation(convId) ?? 'missing'
}
