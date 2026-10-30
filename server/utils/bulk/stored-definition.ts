import { z } from 'zod'

import type {
  BulkDelivery,
  BulkOperationDefinition,
  SimpleDeliveryStep
} from '../../../shared/bulk-operations'

const AmountRangeSchema = z
  .object({
    from: z.string().optional(),
    to: z.string().optional()
  })
  .strict()

const BindingsSchema = z.record(z.string(), z.string())

const TextStepSchema = z
  .object({
    medium: z.enum(['rcs', 'sms']),
    action: z.string(),
    body: z.string(),
    placeholder_bindings: BindingsSchema
  })
  .strict()

const SubjectStepSchema = z
  .object({
    medium: z.enum(['email', 'lre']),
    action: z.string(),
    subject: z.string(),
    body: z.string(),
    placeholder_bindings: BindingsSchema
  })
  .strict()

const DocxStepSchema = z
  .object({
    medium: z.enum(['courrier', 'lrar']),
    action: z.string(),
    filename: z.string(),
    file_base64: z.string(),
    placeholders: z.array(z.string()),
    placeholder_bindings: BindingsSchema,
    summary: z.string()
  })
  .strict()

const StepSchema = z.discriminatedUnion('medium', [
  TextStepSchema,
  SubjectStepSchema,
  DocxStepSchema
])

const RichNodeSchema = z
  .object({
    id: z.string(),
    body: z.string(),
    rich_content: z.record(z.string(), z.unknown()),
    transitions: z.record(z.string(), z.string().nullable())
  })
  .strict()

const DeliverySchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('fallback'),
      steps: z.array(StepSchema).min(1)
    })
    .strict(),
  z
    .object({
      kind: z.literal('rich_rcs'),
      action: z.string(),
      nodes: z.array(RichNodeSchema).min(1),
      placeholder_bindings: BindingsSchema,
      reply_timeout_hours: z.number()
    })
    .strict()
])

const DefinitionSchema = z
  .object({
    source: z.enum(['comptes_locataires', 'lots_locatifs', 'candidats', 'reclamations']),
    bucket_id: z.string(),
    delivery: DeliverySchema,
    notify_manager: z.boolean(),
    required_buckets: z.array(z.string()),
    required_actions: z.array(z.string()),
    required_tags: z.array(z.string()),
    excluded_tags: z.array(z.string()),
    amount_range: AmountRangeSchema.optional(),
    unpaid_months_range: AmountRangeSchema.optional()
  })
  .strict()

type StoredStep = z.infer<typeof StepSchema>
type StoredDelivery = z.infer<typeof DeliverySchema>
type StoredDefinition = z.infer<typeof DefinitionSchema>

const storedStep = (step: SimpleDeliveryStep): StoredStep => {
  const placeholder_bindings = step.placeholderBindings
  if ('fileBase64' in step) {
    return {
      medium: step.medium,
      action: step.action,
      filename: step.filename,
      file_base64: step.fileBase64,
      placeholders: step.placeholders,
      placeholder_bindings,
      summary: step.summary
    }
  }
  if ('subject' in step) {
    return {
      medium: step.medium,
      action: step.action,
      subject: step.subject,
      body: step.body,
      placeholder_bindings
    }
  }
  return { medium: step.medium, action: step.action, body: step.body, placeholder_bindings }
}

const appStep = (step: StoredStep): SimpleDeliveryStep => {
  if ('file_base64' in step) {
    return {
      medium: step.medium,
      action: step.action,
      filename: step.filename,
      fileBase64: step.file_base64,
      placeholders: step.placeholders,
      placeholderBindings: step.placeholder_bindings,
      summary: step.summary
    }
  }
  if ('subject' in step) {
    return {
      medium: step.medium,
      action: step.action,
      subject: step.subject,
      body: step.body,
      placeholderBindings: step.placeholder_bindings
    }
  }
  return {
    medium: step.medium,
    action: step.action,
    body: step.body,
    placeholderBindings: step.placeholder_bindings
  }
}

const storedDelivery = (delivery: BulkDelivery): StoredDelivery => {
  if (delivery.kind === 'fallback') {
    return { kind: 'fallback', steps: delivery.steps.map(storedStep) }
  }
  return {
    kind: 'rich_rcs',
    action: delivery.action,
    nodes: delivery.nodes.map((node) => ({
      id: node.id,
      body: node.body,
      rich_content: node.richContent,
      transitions: node.transitions
    })),
    placeholder_bindings: delivery.placeholderBindings,
    reply_timeout_hours: delivery.replyTimeoutHours
  }
}

const appDelivery = (delivery: StoredDelivery): BulkDelivery => {
  if (delivery.kind === 'fallback') {
    const [first, ...rest] = delivery.steps.map(appStep)
    if (!first) throw new Error('Stored bulk delivery has no step')
    return { kind: 'fallback', steps: [first, ...rest] }
  }
  const [first, ...rest] = delivery.nodes
  if (!first) throw new Error('Stored bulk delivery has no node')
  return {
    kind: 'rich_rcs',
    action: delivery.action,
    nodes: [
      {
        id: first.id,
        body: first.body,
        richContent: first.rich_content,
        transitions: first.transitions
      },
      ...rest.map((node) => ({
        id: node.id,
        body: node.body,
        richContent: node.rich_content,
        transitions: node.transitions
      }))
    ],
    placeholderBindings: delivery.placeholder_bindings,
    replyTimeoutHours: delivery.reply_timeout_hours
  }
}

const storedDefinition = (definition: BulkOperationDefinition): StoredDefinition => ({
  source: definition.source,
  bucket_id: definition.bucketId,
  delivery: storedDelivery(definition.delivery),
  notify_manager: definition.notifyManager,
  required_buckets: definition.requiredBuckets,
  required_actions: definition.requiredActions,
  required_tags: definition.requiredTags,
  excluded_tags: definition.excludedTags,
  ...(definition.amountRange ? { amount_range: definition.amountRange } : {}),
  ...(definition.unpaidMonthsRange ? { unpaid_months_range: definition.unpaidMonthsRange } : {})
})

const appDefinition = (definition: StoredDefinition): BulkOperationDefinition => ({
  source: definition.source,
  bucketId: definition.bucket_id,
  delivery: appDelivery(definition.delivery),
  notifyManager: definition.notify_manager,
  requiredBuckets: definition.required_buckets,
  requiredActions: definition.required_actions,
  requiredTags: definition.required_tags,
  excludedTags: definition.excluded_tags,
  ...(definition.amount_range ? { amountRange: definition.amount_range } : {}),
  ...(definition.unpaid_months_range ? { unpaidMonthsRange: definition.unpaid_months_range } : {})
})

export const parseStoredDefinition = (raw: unknown): BulkOperationDefinition =>
  appDefinition(DefinitionSchema.parse(raw))

export const stringifyStoredDefinition = (definition: BulkOperationDefinition): string =>
  JSON.stringify(DefinitionSchema.parse(storedDefinition(definition)))
