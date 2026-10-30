import { z } from 'zod'

import {
  ACTIVITY_CONTEXTS,
  ACTIVITY_TYPES,
  type ActivityContext,
  COMMUNICATION_CHANNELS,
  isCommunicationType,
  type Mention,
  type TaskState
} from '../../../shared/activities'
import { isRepaymentPlanEventType } from '../../../shared/repayment-plan'

export const MENTION_RE = /@([a-z0-9._-]+)/gi
export const AUTHOR_RE = /^(user|agent|tenant|candidate|automation|system|external):.+$/

const MentionSchema = z.object({
  destinataire: z.string().min(1),
  motif: z.enum(['mention', 'assignation']).optional()
})

const MentionsSchema = z.array(MentionSchema)

export const CreateActivityInput = z
  .object({
    contexte: z.enum(ACTIVITY_CONTEXTS),
    ref: z.string().trim().min(1),
    type: z.enum(ACTIVITY_TYPES),
    channel: z.enum(COMMUNICATION_CHANNELS).nullable().optional(),
    destinataire: z.string().trim().min(1).nullable().optional(),
    recipients: z.array(z.string().trim().min(1)).optional(),
    contenu: z.string().default(''),
    threadId: z.string().trim().min(1).nullable().optional(),
    idempotencyKey: z.string().trim().min(1).nullable().optional()
  })
  .strict()

export const TrustedCreateActivityInput = CreateActivityInput.extend({
  auteur: z
    .string()
    .regex(/^(agent|automation|system):.+$/)
    .optional(),
  bulkId: z.string().trim().min(1).nullable().optional(),
  executionId: z.string().trim().min(1).nullable().optional(),
  dateCreation: z.iso.datetime().optional()
}).strict()

export type CreateActivityInput = z.infer<typeof CreateActivityInput>
export type TrustedCreateActivityInput = z.infer<typeof TrustedCreateActivityInput>

const requires_channel = (type: string): boolean =>
  isCommunicationType(type) || type === 'document.sent_for_signature'

export const ActivityRowSchema = z
  .object({
    type: z.enum(ACTIVITY_TYPES),
    channel: z.enum(COMMUNICATION_CHANNELS).nullable(),
    thread_id: z.string().trim().min(1).nullable(),
    revision: z.number().int().positive().nullable()
  })
  .superRefine((row, ctx) => {
    if (isRepaymentPlanEventType(row.type)) {
      if (row.thread_id == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['thread_id'],
          message: 'Repayment plan requires thread_id'
        })
      }
      if (row.revision != null) {
        ctx.addIssue({
          code: 'custom',
          path: ['revision'],
          message: 'Repayment plan revision must be null'
        })
      }
      return
    }
    if ((row.thread_id == null) !== (row.revision == null)) {
      ctx.addIssue({
        code: 'custom',
        path: ['revision'],
        message: 'thread_id and revision must both be set or both be null'
      })
    }
    if (requires_channel(row.type)) {
      if (row.channel == null) {
        ctx.addIssue({ code: 'custom', path: ['channel'], message: 'Channel is required' })
      }
      if (row.thread_id == null) {
        ctx.addIssue({ code: 'custom', path: ['thread_id'], message: 'Thread is required' })
      }
      return
    }
    if (row.channel != null) {
      ctx.addIssue({ code: 'custom', path: ['channel'], message: 'Channel must be null' })
    }
  })

export const ActivityPatchInput = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('edit_content'),
    contenu: z.string()
  }),
  z.object({
    operation: z.literal('set_evaluation'),
    score: z.number().int().min(1).max(5).nullable(),
    commentaire: z.string().nullable().optional()
  }),
  z.object({
    operation: z.literal('update_action'),
    action: z.string().trim().min(1),
    assigneA: z.string().trim().min(1),
    dateEcheance: z.string().trim().min(1),
    note: z.string().optional()
  }),
  z.object({
    operation: z.literal('complete_action'),
    resultat: z.string().optional()
  }),
  z.object({
    operation: z.literal('reopen_action'),
    assigneA: z.string().trim().min(1),
    dateEcheance: z.string().trim().min(1),
    note: z.string().optional()
  }),
  z.object({
    operation: z.literal('ignore_action'),
    motif: z.string().optional()
  }),
  z.object({ operation: z.literal('withdraw_note') }),
  z.object({
    operation: z.literal('set_mention'),
    lu: z.boolean().optional()
  }),
  z.object({
    operation: z.literal('set_boost'),
    emoji: z.string().trim().max(16).nullable()
  }),
  z.object({
    operation: z.literal('save_repayment_plan'),
    contenu: z.string()
  })
])

export type ListActivitiesOptions = {
  contexts?: ActivityContext[]
  rattachement?: string
  inbox?: boolean
  unreadOnly?: boolean
  auteurs?: string[]
  id_client?: string
  id_locataire?: string
  id_lot?: string
  type?: string
  currentThreads?: boolean
  state?: TaskState
  assignee?: 'me' | 'other'
  createdBy?: 'me'
  order?: 'due_asc'
  limit?: number
  offset?: number
  all?: boolean
}

export class ActivitiesError extends Error {
  constructor(
    message: string,
    readonly code: 'not_found' | 'forbidden' | 'invalid_body' | 'conflict' = 'invalid_body'
  ) {
    super(message)
    this.name = 'ActivitiesError'
  }
}

export const parse_mentions = (raw: string): Mention[] => MentionsSchema.parse(JSON.parse(raw))
