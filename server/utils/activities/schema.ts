import { z } from 'zod'

import {
  ACTIVITY_CONTEXTS,
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
  COMMUNICATION_TYPES,
  type ActionActivityState,
  type ActivityType,
  type Mention
} from '../../../shared/activites'

export const MENTION_RE = /@([a-z0-9._-]+)/gi
export const AUTHOR_RE = /^(user|agent|tenant|candidate|automation|system|external):.+$/

export const is_communication_type = (type: ActivityType): boolean =>
  (COMMUNICATION_TYPES as readonly string[]).includes(type)

const MentionSchema = z.object({
  destinataire: z.string().min(1),
  lu: z.boolean(),
  boost: z.string().nullable(),
  inbox: z.boolean().optional(),
  motif: z.enum(['mention', 'assignation']).optional()
})

const MentionsSchema = z.array(MentionSchema)

export const CreateActivityInput = z
  .object({
    contexte: z.enum(ACTIVITY_CONTEXTS),
    ref: z.string().trim().min(1),
    type: z.enum(ACTIVITY_TYPES),
    statut: z.enum(ACTIVITY_STATUSES).nullable().optional(),
    destinataire: z.string().trim().min(1).nullable().optional(),
    recipients: z.array(z.string().trim().min(1)).optional(),
    contenu: z.string().default(''),
    idempotency_key: z.string().trim().min(1).nullable().optional()
  })
  .strict()

export const TrustedCreateActivityInput = CreateActivityInput.extend({
  auteur: z
    .string()
    .regex(/^(agent|automation|system):.+$/)
    .optional(),
  bulk_id: z.string().trim().min(1).nullable().optional(),
  execution_id: z.string().trim().min(1).nullable().optional(),
  date_creation: z.iso.datetime().optional()
}).strict()

export type CreateActivityInput = z.infer<typeof CreateActivityInput>
export type TrustedCreateActivityInput = z.infer<typeof TrustedCreateActivityInput>

export const ActivityPatchInput = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('edit_content'),
    titre: z.string().nullable().optional(),
    contenu: z.string()
  }),
  z.object({
    operation: z.literal('set_evaluation'),
    score: z.number().int().min(1).max(5).nullable(),
    commentaire: z.string().nullable().optional()
  }),
  z.object({ operation: z.literal('set_status'), statut: z.enum(ACTIVITY_STATUSES) }),
  z.object({
    operation: z.literal('update_action'),
    action: z.string().trim().min(1),
    assigne_a: z.string().trim().min(1),
    date_echeance: z.string().trim().min(1),
    note: z.string().optional()
  }),
  z.object({
    operation: z.literal('complete_action'),
    resultat: z.string().optional()
  }),
  z.object({
    operation: z.literal('reopen_action'),
    assigne_a: z.string().trim().min(1),
    date_echeance: z.string().trim().min(1),
    note: z.string().optional()
  }),
  z.object({
    operation: z.literal('ignore_action'),
    motif: z.string().optional()
  }),
  z.object({ operation: z.literal('withdraw_note') }),
  z.object({
    operation: z.literal('set_mention'),
    lu: z.boolean().optional(),
    boost: z.string().nullable().optional()
  }),
  z.object({
    operation: z.literal('set_boost'),
    emoji: z.string().trim().max(16).nullable()
  })
])

export type ListActivitiesOptions = {
  rattachement?: string
  inbox?: boolean
  unread_only?: boolean
  auteurs?: string[]
  id_client?: string
  id_locataire?: string
  id_lot?: string
  type?: string
  statut?: string
  current_threads?: boolean
  state?: ActionActivityState
  limit?: number
  offset?: number
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

export const parse_mentions = (raw: string): Mention[] => {
  try {
    const result = MentionsSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data : []
  } catch {
    return []
  }
}
