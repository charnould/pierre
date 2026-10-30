import { z } from 'zod'

import type {
  BulkJobPayload,
  BulkOutcome,
  BulkRichRcsResponse,
  PreviewRow,
  SkippedDeliveryStep
} from '../../../shared/bulk-operations'

const ReasonSchema = z.union([
  z.object({ code: z.literal('missing_destination') }).strict(),
  z.object({ code: z.literal('unverified_contact') }).strict(),
  z.object({ code: z.literal('invalid_contact') }).strict(),
  z.object({ code: z.literal('missing_content') }).strict(),
  z.object({ code: z.literal('missing_file') }).strict(),
  z.object({ code: z.literal('incompatible_contact'), status: z.string() }).strict(),
  z.object({ code: z.literal('missing_placeholders'), placeholders: z.array(z.string()) }).strict()
])

const SkippedStepSchema = z
  .object({
    medium: z.enum(['rcs', 'sms', 'email', 'courrier', 'lrar', 'lre']),
    step_index: z.number(),
    reasons: z.array(ReasonSchema)
  })
  .strict()

const RouteSchema = z
  .discriminatedUnion('kind', [
    z
      .object({
        kind: z.literal('fallback'),
        medium: z.enum(['rcs', 'sms', 'email', 'courrier', 'lrar', 'lre']),
        step_index: z.number()
      })
      .strict(),
    z.object({ kind: z.literal('rich_rcs'), medium: z.literal('rcs') }).strict()
  ])
  .nullable()

const RowSchema = z
  .object({
    id_locataire: z.string(),
    id_client: z.string().nullable(),
    nom: z.string().nullable(),
    email: z.string().nullable(),
    telephone: z.string().nullable(),
    adresse: z.string().nullable(),
    gestionnaire: z.string().nullable(),
    gestionnaire_email: z.string().nullable(),
    values: z.record(z.string(), z.unknown()),
    status: z.enum(['eligible', 'no_usable_route']),
    route: RouteSchema,
    skipped_steps: z.array(SkippedStepSchema)
  })
  .strict()

const DeliveryStatusSchema = z.enum([
  'sent',
  'delivered',
  'read',
  'failed',
  'undelivered',
  'expired',
  'rejected',
  'bounced',
  'returned',
  'refused',
  'unclaimed'
])

const ResponseSchema = z
  .object({
    node_id: z.string(),
    postback: z.string(),
    label: z.string().nullable(),
    text: z.string(),
    activity_id: z.number(),
    occurred_at: z.string()
  })
  .strict()

const PayloadSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('fallback'),
      row: RowSchema,
      stage: z.enum(['attempt', 'status']),
      step_index: z.number(),
      remaining_statuses: z.array(DeliveryStatusSchema).optional(),
      previous_activity_id: z.number().optional(),
      effects_applied_at: z.string().optional()
    })
    .strict(),
  z
    .object({
      kind: z.literal('rich_rcs'),
      row: RowSchema,
      stage: z.enum(['rich_send', 'rich_wait_delivery', 'rich_wait_reply']),
      node_id: z.string(),
      response_history: z.array(ResponseSchema),
      effects_applied_at: z.string().optional()
    })
    .strict()
])

const StoredOutcomeSchema = z.union([
  z
    .object({
      code: z.literal('all_delivery_attempts_failed'),
      status: z.string(),
      occurred_at: z.string()
    })
    .strict(),
  z
    .object({
      code: z.enum(['final_failure', 'no_usable_route']),
      skipped_steps: z.array(SkippedStepSchema),
      activity_id: z.number().nullable().optional(),
      created: z.boolean().optional()
    })
    .strict(),
  z
    .object({
      code: DeliveryStatusSchema,
      medium: z.string(),
      activity_id: z.number()
    })
    .strict(),
  z
    .object({
      code: z.literal('send_failed'),
      node_id: z.string(),
      activity_id: z.number()
    })
    .strict(),
  z
    .object({
      code: z.literal('completed'),
      delivery_status: z.enum(['delivered', 'read']),
      node_id: z.string(),
      activity_id: z.number()
    })
    .strict(),
  z
    .object({
      code: z.literal('completed'),
      last_postback: z.string(),
      last_label: z.string().nullable(),
      activity_id: z.number()
    })
    .strict(),
  z
    .object({
      code: z.enum(['delivery_timeout', 'reply_timeout']),
      node_id: z.string()
    })
    .strict(),
  z
    .object({
      code: z.literal('applied'),
      activity_id: z.number(),
      created: z.literal(true)
    })
    .strict()
])

type StoredRow = z.infer<typeof RowSchema>
type StoredPayload = z.infer<typeof PayloadSchema>
type StoredOutcome = z.infer<typeof StoredOutcomeSchema>

const storedSkipped = (step: SkippedDeliveryStep) => ({
  medium: step.medium,
  step_index: step.stepIndex,
  reasons: step.reasons
})

const appSkipped = (step: z.infer<typeof SkippedStepSchema>): SkippedDeliveryStep => ({
  medium: step.medium,
  stepIndex: step.step_index,
  reasons: step.reasons
})

const storedRow = (row: PreviewRow): StoredRow => ({
  id_locataire: row.id_locataire,
  id_client: row.id_client,
  nom: row.nom,
  email: row.email,
  telephone: row.telephone,
  adresse: row.adresse,
  gestionnaire: row.gestionnaire,
  gestionnaire_email: row.gestionnaire_email,
  values: row.values,
  status: row.status,
  route:
    row.route == null
      ? null
      : row.route.kind === 'fallback'
        ? { kind: 'fallback', medium: row.route.medium, step_index: row.route.stepIndex }
        : { kind: 'rich_rcs', medium: 'rcs' },
  skipped_steps: row.skippedSteps.map(storedSkipped)
})

const appRow = (row: StoredRow): PreviewRow => ({
  id_locataire: row.id_locataire,
  id_client: row.id_client,
  nom: row.nom,
  email: row.email,
  telephone: row.telephone,
  adresse: row.adresse,
  gestionnaire: row.gestionnaire,
  gestionnaire_email: row.gestionnaire_email,
  values: row.values,
  status: row.status,
  route:
    row.route == null
      ? null
      : row.route.kind === 'fallback'
        ? { kind: 'fallback', medium: row.route.medium, stepIndex: row.route.step_index }
        : { kind: 'rich_rcs', medium: 'rcs' },
  skippedSteps: row.skipped_steps.map(appSkipped)
})

const storedResponse = (response: BulkRichRcsResponse) => ({
  node_id: response.nodeId,
  postback: response.postback,
  label: response.label,
  text: response.text,
  activity_id: response.activityId,
  occurred_at: response.occurredAt
})

const appResponse = (response: z.infer<typeof ResponseSchema>): BulkRichRcsResponse => ({
  nodeId: response.node_id,
  postback: response.postback,
  label: response.label,
  text: response.text,
  activityId: response.activity_id,
  occurredAt: response.occurred_at
})

const storedPayload = (payload: BulkJobPayload): StoredPayload => {
  if (payload.kind === 'fallback') {
    return {
      kind: 'fallback',
      row: storedRow(payload.row),
      stage: payload.stage,
      step_index: payload.stepIndex,
      ...(payload.remainingStatuses ? { remaining_statuses: payload.remainingStatuses } : {}),
      ...(payload.previousActivityId != null
        ? { previous_activity_id: payload.previousActivityId }
        : {}),
      ...(payload.effectsAppliedAt ? { effects_applied_at: payload.effectsAppliedAt } : {})
    }
  }
  return {
    kind: 'rich_rcs',
    row: storedRow(payload.row),
    stage: payload.stage,
    node_id: payload.nodeId,
    response_history: payload.responseHistory.map(storedResponse),
    ...(payload.effectsAppliedAt ? { effects_applied_at: payload.effectsAppliedAt } : {})
  }
}

const appPayload = (payload: StoredPayload): BulkJobPayload => {
  if (payload.kind === 'fallback') {
    return {
      kind: 'fallback',
      row: appRow(payload.row),
      stage: payload.stage,
      stepIndex: payload.step_index,
      ...(payload.remaining_statuses ? { remainingStatuses: payload.remaining_statuses } : {}),
      ...(payload.previous_activity_id != null
        ? { previousActivityId: payload.previous_activity_id }
        : {}),
      ...(payload.effects_applied_at ? { effectsAppliedAt: payload.effects_applied_at } : {})
    }
  }
  return {
    kind: 'rich_rcs',
    row: appRow(payload.row),
    stage: payload.stage,
    nodeId: payload.node_id,
    responseHistory: payload.response_history.map(appResponse),
    ...(payload.effects_applied_at ? { effectsAppliedAt: payload.effects_applied_at } : {})
  }
}

export const parseStoredPayload = (raw: unknown): BulkJobPayload =>
  appPayload(PayloadSchema.parse(raw))

export const stringifyStoredPayload = (payload: BulkJobPayload): string =>
  JSON.stringify(PayloadSchema.parse(storedPayload(payload)))

export const storedOutcome = (outcome: BulkOutcome): StoredOutcome => {
  if (outcome.code === 'all_delivery_attempts_failed') {
    return StoredOutcomeSchema.parse({
      code: outcome.code,
      status: outcome.status,
      occurred_at: outcome.occurredAt
    })
  }
  if ('skippedSteps' in outcome) {
    return StoredOutcomeSchema.parse({
      code: outcome.code,
      skipped_steps: outcome.skippedSteps.map(storedSkipped),
      ...(outcome.activityId !== undefined ? { activity_id: outcome.activityId } : {}),
      ...(outcome.created !== undefined ? { created: outcome.created } : {})
    })
  }
  if (outcome.code === 'send_failed') {
    return StoredOutcomeSchema.parse({
      code: outcome.code,
      node_id: outcome.nodeId,
      activity_id: outcome.activityId
    })
  }
  if (outcome.code === 'completed') {
    return StoredOutcomeSchema.parse(
      'deliveryStatus' in outcome
        ? {
            code: outcome.code,
            delivery_status: outcome.deliveryStatus,
            node_id: outcome.nodeId,
            activity_id: outcome.activityId
          }
        : {
            code: outcome.code,
            last_postback: outcome.lastPostback,
            last_label: outcome.lastLabel,
            activity_id: outcome.activityId
          }
    )
  }
  if (outcome.code === 'delivery_timeout' || outcome.code === 'reply_timeout') {
    return StoredOutcomeSchema.parse({ code: outcome.code, node_id: outcome.nodeId })
  }
  if (outcome.code === 'applied') {
    return StoredOutcomeSchema.parse({
      code: outcome.code,
      activity_id: outcome.activityId,
      created: outcome.created
    })
  }
  if ('medium' in outcome) {
    return StoredOutcomeSchema.parse({
      code: outcome.code,
      medium: outcome.medium,
      activity_id: outcome.activityId
    })
  }
  throw new Error(`Unsupported bulk outcome: ${outcome.code}`)
}

export const parseStoredOutcome = (raw: unknown): BulkOutcome => {
  const outcome = StoredOutcomeSchema.parse(raw)
  if (outcome.code === 'all_delivery_attempts_failed') {
    return {
      code: outcome.code,
      status: outcome.status,
      occurredAt: outcome.occurred_at
    }
  }
  if ('skipped_steps' in outcome) {
    return {
      code: outcome.code,
      skippedSteps: outcome.skipped_steps.map(appSkipped),
      ...(outcome.activity_id !== undefined ? { activityId: outcome.activity_id } : {}),
      ...(outcome.created !== undefined ? { created: outcome.created } : {})
    }
  }
  if (outcome.code === 'send_failed') {
    return {
      code: outcome.code,
      nodeId: outcome.node_id,
      activityId: outcome.activity_id
    }
  }
  if (outcome.code === 'completed') {
    return 'delivery_status' in outcome
      ? {
          code: outcome.code,
          deliveryStatus: outcome.delivery_status,
          nodeId: outcome.node_id,
          activityId: outcome.activity_id
        }
      : {
          code: outcome.code,
          lastPostback: outcome.last_postback,
          lastLabel: outcome.last_label,
          activityId: outcome.activity_id
        }
  }
  if (outcome.code === 'delivery_timeout' || outcome.code === 'reply_timeout') {
    return { code: outcome.code, nodeId: outcome.node_id }
  }
  if (outcome.code === 'applied') {
    return {
      code: outcome.code,
      activityId: outcome.activity_id,
      created: outcome.created
    }
  }
  if ('medium' in outcome) {
    return {
      code: outcome.code,
      medium: outcome.medium,
      activityId: outcome.activity_id
    }
  }
  throw new Error(`Unsupported stored bulk outcome: ${outcome.code}`)
}
