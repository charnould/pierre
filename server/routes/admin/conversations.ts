import { z } from 'zod/v4'

import {
  REVIEW_CATEGORIES,
  REVIEW_STATUSES,
  type ReviewCategory
} from '../../../shared/admin-conversations'
import type { AuthContext } from '../../utils/authenticate-user'
import {
  get_conversation,
  list_conversations,
  save_conversation_review
} from '../../utils/handle-conversation'

const ListQuery = z.object({
  q: z.string().optional(),
  reviewStatus: z.enum(['unreviewed', ...REVIEW_STATUSES]).optional(),
  audience: z.enum(['public', 'collaborator']).optional(),
  chatbot: z.string().optional(),
  offset: z.coerce.number().int().min(0).optional()
})

const ReviewBody = z.object({
  expectedUpdatedAt: z.string().nullable(),
  status: z.enum(REVIEW_STATUSES),
  score: z.number().int().min(1).max(5).nullable(),
  categories: z.array(z.enum(REVIEW_CATEGORIES)),
  comment: z.string().max(4000).optional()
})

export const listConversations = (c: AuthContext) => {
  const parsed = ListQuery.safeParse({
    q: c.req.query('q'),
    reviewStatus: c.req.query('reviewStatus'),
    audience: c.req.query('audience'),
    chatbot: c.req.query('chatbot'),
    offset: c.req.query('offset')
  })
  if (!parsed.success) {
    return c.json({ error: { code: 'invalid_query', message: 'Requête invalide.' } }, 400)
  }
  return c.json({ data: list_conversations(parsed.data) })
}

export const getConversation = (c: AuthContext) => {
  const conversation = get_conversation(c.req.param('convId') ?? '')
  if (!conversation) {
    return c.json({ error: { code: 'not_found', message: 'Conversation introuvable.' } }, 404)
  }
  return c.json({ data: conversation })
}

export const putConversationReview = async (c: AuthContext) => {
  const body = ReviewBody.safeParse(await c.req.json().catch(() => null))
  if (!body.success) {
    return c.json({ error: { code: 'invalid_body', message: 'Revue invalide.' } }, 400)
  }
  const categories = [...new Set(body.data.categories)] as ReviewCategory[]
  const saved = save_conversation_review(c.req.param('convId') ?? '', c.get('user').email, {
    ...body.data,
    categories
  })
  if (saved === 'missing') {
    return c.json({ error: { code: 'not_found', message: 'Conversation introuvable.' } }, 404)
  }
  if (saved === 'conflict') {
    return c.json(
      {
        error: {
          code: 'review_conflict',
          message: 'Cette revue a été modifiée par un autre administrateur.'
        }
      },
      409
    )
  }
  return c.json({ data: saved })
}
