import {
  type RepaymentPlanCloseReason,
  type RepaymentPlanClosedContent,
  type RepaymentPlanEventContent,
  is_repayment_plan_event_type,
  parse_repayment_plan_content
} from './repayment-plan'

export { REPAYMENT_PLAN_CLOSE_REASONS, parse_repayment_plan_content } from './repayment-plan'
export type {
  RepaymentPlanCloseReason,
  RepaymentPlanEventContent,
  RepaymentPlanEventType,
  RepaymentPlanSnapshot
} from './repayment-plan'

export const ACTIVITY_CONTEXTS = [
  'tickets',
  'repayment',
  'automations',
  'bulk',
  'a_qualifier'
] as const
export type ActivityContext = (typeof ACTIVITY_CONTEXTS)[number]

export const COMMUNICATION_CHANNELS = [
  'rcs',
  'sms',
  'email',
  'postal_letter',
  'postal_registered_letter_with_acknowledgement',
  'electronic_registered_delivery',
  'electronic_registered_letter'
] as const
export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number]

const COMMUNICATION_CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  rcs: 'RCS',
  sms: 'SMS',
  email: 'Courriel',
  postal_letter: 'courrier postal simple',
  postal_registered_letter_with_acknowledgement:
    'lettre recommandée avec accusé de réception (LRAR)',
  electronic_registered_delivery: 'envoi recommandé électronique (ERE)',
  electronic_registered_letter: 'lettre recommandée électronique (LRE)'
}

export const ACTIVITY_TYPES = [
  'note.published',
  'note.updated',
  'note.withdrawn',
  'task.created',
  'task.updated',
  'task.completed',
  'task.ignored',
  'task.reopened',
  'task.deleted',
  'case.group_changed',
  'case.bucket_changed',
  'case.assignee_changed',
  'case.tags_changed',
  'ticket.field_changed',
  'communication.sent',
  'communication.ok',
  'communication.failed',
  'communication.received',
  'communication.imported',
  'activity.read',
  'activity.reaction_changed',
  'repayment_plan.created',
  'repayment_plan.updated',
  'repayment_plan.finalized',
  'repayment_plan.closed',
  'artifact.generated',
  'artifact.regenerated',
  'artifact.finalized',
  'artifact.discarded',
  'artifact.feedback_recorded',
  'automation.reported',
  'bulk.ran',
  'bulk.applied',
  'bulk.no_route',
  'ledger.movement_recorded',
  'document.generated',
  'document.sent_for_signature',
  'document.signed',
  'document.signature_refused',
  'document.signature_expired',
  'document.signature_cancelled',
  'document.signature_recorded'
] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export const ACTIVITY_CONTENT_VERSION = 2 as const

export type Mention = {
  destinataire: string
  motif?: 'mention' | 'assignation'
}

export type EntityRef = {
  id: string
  label: string
}

export type ActivityValue = null | string | string[] | number | boolean | EntityRef | EntityRef[]

export type TaskState = 'open' | 'completed' | 'ignored' | 'deleted'

type TaskSnapshot = {
  title: string
  state: TaskState
  assignee?: EntityRef
  due_date?: string
}

type TaskChangeField = 'title' | 'assignee' | 'due_date' | 'note'

export type TaskChange = {
  field: TaskChangeField
  before: ActivityValue
  after: ActivityValue
}

export type NoteContent = {
  version: 2
  text?: string
}

export type TaskContent = {
  version: 2
  task: TaskSnapshot
  changes?: TaskChange[]
  note?: string
  result?: string
  reason?: string
}

export type CaseChangeContent = {
  version: 2
  before: ActivityValue
  after: ActivityValue
  note?: string
}

type TicketChangeContent = CaseChangeContent & {
  field: string
}

export type CommunicationOpenedContent = {
  version: 2
  sender: string
  subject?: string
  body: string
  action?: string
  choices?: string[]
  provider?: string
  purpose?: 'general' | 'payment_plan' | 'bulk'
  related_id?: string
  fallback_from?: string
}

export type CommunicationStatusContent = {
  version: 2
  result?: 'delivered' | 'read'
  reason?: string
  provider_event_id?: string
}

export type ActivityMetaContent = {
  version: 2
  source_activity_id: number
  emoji?: string
}

export type TitledContent = {
  version: 2
  title: string
  values?: Record<string, ActivityValue>
  note?: string
}

export type SignatureContent = {
  version: 2
  document: {
    id: string
    type: string
    title: string
    version: string
    hash?: string
  }
  provider?: string
  signers: Array<{
    id: string
    label: string
    role?: string
    order?: number
    status: 'pending' | 'signed' | 'refused'
  }>
  signer?: EntityRef
  signed_document_id?: string
  evidence_id?: string
  related_plan_id?: string
  method?: 'electronic' | 'offline'
  reason?: string
}

export type ActivityContent =
  | NoteContent
  | TaskContent
  | CaseChangeContent
  | TicketChangeContent
  | CommunicationOpenedContent
  | CommunicationStatusContent
  | ActivityMetaContent
  | TitledContent
  | SignatureContent
  | RepaymentPlanEventContent
  | RepaymentPlanClosedContent

const NOTE_TYPES = new Set<string>(['note.published', 'note.updated', 'note.withdrawn'])
const TASK_TYPES = new Set<string>([
  'task.created',
  'task.updated',
  'task.completed',
  'task.ignored',
  'task.reopened',
  'task.deleted'
])
const CASE_CHANGE_TYPES = new Set<string>([
  'case.group_changed',
  'case.bucket_changed',
  'case.assignee_changed',
  'case.tags_changed'
])
const COMMUNICATION_OPENED_TYPES = new Set<string>([
  'communication.sent',
  'communication.received',
  'communication.imported'
])
const COMMUNICATION_STATUS_TYPES = new Set<string>(['communication.ok', 'communication.failed'])
const COMMUNICATION_TYPES = new Set<string>([
  ...COMMUNICATION_OPENED_TYPES,
  ...COMMUNICATION_STATUS_TYPES
])
const META_TYPES = new Set<string>(['activity.read', 'activity.reaction_changed'])
const TITLED_TYPES = new Set<string>([
  'artifact.generated',
  'artifact.regenerated',
  'artifact.finalized',
  'artifact.discarded',
  'artifact.feedback_recorded',
  'automation.reported',
  'bulk.ran',
  'bulk.applied',
  'bulk.no_route',
  'ledger.movement_recorded'
])
const SIGNATURE_TYPES = new Set<string>([
  'document.generated',
  'document.sent_for_signature',
  'document.signed',
  'document.signature_refused',
  'document.signature_expired',
  'document.signature_cancelled',
  'document.signature_recorded'
])

export const is_activity_type = (value: string): value is ActivityType =>
  (ACTIVITY_TYPES as readonly string[]).includes(value)

const is_communication_channel = (value: string): value is CommunicationChannel =>
  (COMMUNICATION_CHANNELS as readonly string[]).includes(value)

export const is_communication_type = (type: string): boolean => COMMUNICATION_TYPES.has(type)

export const is_communication_opened_type = (type: string): boolean =>
  COMMUNICATION_OPENED_TYPES.has(type)

export const is_communication_status_type = (type: string): boolean =>
  COMMUNICATION_STATUS_TYPES.has(type)

export const is_note_type = (type: string): boolean => NOTE_TYPES.has(type)

export const is_task_type = (type: string): boolean => TASK_TYPES.has(type)

export const is_case_change_type = (type: string): boolean => CASE_CHANGE_TYPES.has(type)

export const is_signature_type = (type: string): boolean => SIGNATURE_TYPES.has(type)

export const is_hidden_timeline_type = (type: string): boolean =>
  META_TYPES.has(type) || COMMUNICATION_STATUS_TYPES.has(type)

export const communication_channel_label = (channel: CommunicationChannel): string =>
  COMMUNICATION_CHANNEL_LABELS[channel]

export const parse_contenu_json = (raw: string): Record<string, unknown> => {
  try {
    const value = JSON.parse(raw) as unknown
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }
    return {}
  } catch {
    return {}
  }
}

const non_empty_string = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const as_string = (value: unknown): string | undefined =>
  non_empty_string(value) ? value.trim() : undefined

const parse_entity_ref = (value: unknown): EntityRef | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (!non_empty_string(record['id']) || !non_empty_string(record['label'])) return null
  return { id: record['id'].trim(), label: record['label'].trim() }
}

const parse_activity_value = (value: unknown): ActivityValue | undefined => {
  if (value === null) return null
  if (typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    if (value.every((entry) => typeof entry === 'string')) return value
    const refs = value.map(parse_entity_ref)
    if (refs.every((entry): entry is EntityRef => entry != null)) return refs
    return undefined
  }
  return parse_entity_ref(value) ?? undefined
}

const parse_task_snapshot = (value: unknown): TaskSnapshot | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (!non_empty_string(record['title'])) return null
  if (!['open', 'completed', 'ignored', 'deleted'].includes(String(record['state']))) return null
  const assignee =
    record['assignee'] === undefined ? undefined : parse_entity_ref(record['assignee'])
  if (record['assignee'] !== undefined && !assignee) return null
  return {
    title: record['title'].trim(),
    state: record['state'] as TaskState,
    ...(assignee ? { assignee } : {}),
    ...(as_string(record['due_date']) ? { due_date: as_string(record['due_date']) } : {})
  }
}

export const parse_note_content = (raw: string): NoteContent | null => {
  const value = parse_contenu_json(raw)
  if (value['version'] !== 2) return null
  const text = value['text']
  if (text !== undefined && typeof text !== 'string') return null
  return { version: 2, ...(typeof text === 'string' ? { text } : {}) }
}

export const parse_task_content = (raw: string): TaskContent | null => {
  const value = parse_contenu_json(raw)
  if (value['version'] !== 2) return null
  const task = parse_task_snapshot(value['task'])
  if (!task) return null
  const changes = value['changes']
  if (changes !== undefined) {
    if (!Array.isArray(changes)) return null
    for (const change of changes) {
      if (!change || typeof change !== 'object' || Array.isArray(change)) return null
      const record = change as Record<string, unknown>
      if (!['title', 'assignee', 'due_date', 'note'].includes(String(record['field']))) return null
      if (parse_activity_value(record['before']) === undefined) return null
      if (parse_activity_value(record['after']) === undefined) return null
    }
  }
  return {
    version: 2,
    task,
    ...(Array.isArray(changes) ? { changes: changes as TaskChange[] } : {}),
    ...(as_string(value['note']) ? { note: as_string(value['note']) } : {}),
    ...(as_string(value['result']) ? { result: as_string(value['result']) } : {}),
    ...(as_string(value['reason']) ? { reason: as_string(value['reason']) } : {})
  }
}

export const parse_case_change_content = (raw: string): CaseChangeContent | null => {
  const value = parse_contenu_json(raw)
  if (value['version'] !== 2) return null
  const before = parse_activity_value(value['before'])
  const after = parse_activity_value(value['after'])
  if (before === undefined || after === undefined) return null
  return {
    version: 2,
    before,
    after,
    ...(as_string(value['note']) ? { note: as_string(value['note']) } : {})
  }
}

const parse_ticket_change_content = (raw: string): TicketChangeContent | null => {
  const parsed = parse_case_change_content(raw)
  const field = as_string(parse_contenu_json(raw)['field'])
  if (!parsed || !field) return null
  return { ...parsed, field }
}

export const parse_communication_opened_content = (
  raw: string
): CommunicationOpenedContent | null => {
  const value = parse_contenu_json(raw)
  if (
    value['version'] !== 2 ||
    !non_empty_string(value['sender']) ||
    typeof value['body'] !== 'string'
  ) {
    return null
  }
  const purpose = value['purpose']
  if (
    purpose !== undefined &&
    purpose !== 'general' &&
    purpose !== 'payment_plan' &&
    purpose !== 'bulk'
  ) {
    return null
  }
  const choices = value['choices']
  if (choices !== undefined) {
    if (!Array.isArray(choices) || !choices.every((entry) => typeof entry === 'string')) return null
  }
  return {
    version: 2,
    sender: value['sender'].trim(),
    body: value['body'],
    ...(as_string(value['subject']) ? { subject: as_string(value['subject']) } : {}),
    ...(as_string(value['action']) ? { action: as_string(value['action']) } : {}),
    ...(choices ? { choices: choices as string[] } : {}),
    ...(as_string(value['provider']) ? { provider: as_string(value['provider']) } : {}),
    ...(purpose ? { purpose } : {}),
    ...(as_string(value['related_id']) ? { related_id: as_string(value['related_id']) } : {}),
    ...(as_string(value['fallback_from'])
      ? { fallback_from: as_string(value['fallback_from']) }
      : {})
  }
}

export const parse_communication_status_content = (
  raw: string
): CommunicationStatusContent | null => {
  const value = parse_contenu_json(raw)
  if (value['version'] !== 2) return null
  const result = value['result']
  if (result !== undefined && result !== 'delivered' && result !== 'read') return null
  return {
    version: 2,
    ...(result ? { result } : {}),
    ...(as_string(value['reason']) ? { reason: as_string(value['reason']) } : {}),
    ...(as_string(value['provider_event_id'])
      ? { provider_event_id: as_string(value['provider_event_id']) }
      : {})
  }
}

export const parse_activity_meta_content = (raw: string): ActivityMetaContent | null => {
  const value = parse_contenu_json(raw)
  if (value['version'] !== 2 || typeof value['source_activity_id'] !== 'number') return null
  return {
    version: 2,
    source_activity_id: value['source_activity_id'],
    ...(as_string(value['emoji']) ? { emoji: as_string(value['emoji']) } : {})
  }
}

export const parse_titled_content = (raw: string): TitledContent | null => {
  const value = parse_contenu_json(raw)
  if (value['version'] !== 2 || !non_empty_string(value['title'])) return null
  const values = value['values']
  if (values !== undefined) {
    if (!values || typeof values !== 'object' || Array.isArray(values)) return null
    for (const entry of Object.values(values as Record<string, unknown>)) {
      if (parse_activity_value(entry) === undefined) return null
    }
  }
  return {
    version: 2,
    title: value['title'].trim(),
    ...(values ? { values: values as Record<string, ActivityValue> } : {}),
    ...(as_string(value['note']) ? { note: as_string(value['note']) } : {})
  }
}

export const parse_signature_content = (raw: string): SignatureContent | null => {
  const value = parse_contenu_json(raw)
  if (value['version'] !== 2 || !value['document'] || typeof value['document'] !== 'object') {
    return null
  }
  const document = value['document'] as Record<string, unknown>
  if (
    !non_empty_string(document['id']) ||
    !non_empty_string(document['type']) ||
    !non_empty_string(document['title']) ||
    !non_empty_string(document['version'])
  ) {
    return null
  }
  if (!Array.isArray(value['signers'])) return null
  const signers: SignatureContent['signers'] = []
  for (const entry of value['signers']) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null
    const record = entry as Record<string, unknown>
    if (
      !non_empty_string(record['id']) ||
      !non_empty_string(record['label']) ||
      !['pending', 'signed', 'refused'].includes(String(record['status']))
    ) {
      return null
    }
    signers.push({
      id: record['id'].trim(),
      label: record['label'].trim(),
      status: record['status'] as 'pending' | 'signed' | 'refused',
      ...(as_string(record['role']) ? { role: as_string(record['role']) } : {}),
      ...(typeof record['order'] === 'number' ? { order: record['order'] } : {})
    })
  }
  const signer = value['signer'] === undefined ? undefined : parse_entity_ref(value['signer'])
  if (value['signer'] !== undefined && !signer) return null
  const method = value['method']
  if (method !== undefined && method !== 'electronic' && method !== 'offline') return null
  return {
    version: 2,
    document: {
      id: document['id'].trim(),
      type: document['type'].trim(),
      title: document['title'].trim(),
      version: document['version'].trim(),
      ...(as_string(document['hash']) ? { hash: as_string(document['hash']) } : {})
    },
    signers,
    ...(as_string(value['provider']) ? { provider: as_string(value['provider']) } : {}),
    ...(signer ? { signer } : {}),
    ...(as_string(value['signed_document_id'])
      ? { signed_document_id: as_string(value['signed_document_id']) }
      : {}),
    ...(as_string(value['evidence_id']) ? { evidence_id: as_string(value['evidence_id']) } : {}),
    ...(as_string(value['related_plan_id'])
      ? { related_plan_id: as_string(value['related_plan_id']) }
      : {}),
    ...(method ? { method } : {}),
    ...(as_string(value['reason']) ? { reason: as_string(value['reason']) } : {})
  }
}

export const parse_activity_content = (type: string, raw: string): ActivityContent | null => {
  if (NOTE_TYPES.has(type)) return parse_note_content(raw)
  if (TASK_TYPES.has(type)) return parse_task_content(raw)
  if (CASE_CHANGE_TYPES.has(type)) return parse_case_change_content(raw)
  if (type === 'ticket.field_changed') return parse_ticket_change_content(raw)
  if (COMMUNICATION_OPENED_TYPES.has(type)) return parse_communication_opened_content(raw)
  if (COMMUNICATION_STATUS_TYPES.has(type)) return parse_communication_status_content(raw)
  if (META_TYPES.has(type)) return parse_activity_meta_content(raw)
  if (is_repayment_plan_event_type(type)) return parse_repayment_plan_content(type, raw)
  if (TITLED_TYPES.has(type)) return parse_titled_content(raw)
  if (SIGNATURE_TYPES.has(type)) return parse_signature_content(raw)
  return null
}

export const activity_payload = (type: ActivityType, raw: string): Record<string, unknown> => {
  const parsed = parse_activity_content(type, raw)
  return parsed ? (parsed as unknown as Record<string, unknown>) : {}
}

export const activity_texte = (type: ActivityType, raw: string): string => {
  const payload = parse_activity_content(type, raw)
  if (!payload) return ''
  if ('text' in payload && typeof payload.text === 'string') return payload.text
  if ('body' in payload && typeof payload.body === 'string') return payload.body
  if ('note' in payload && typeof payload.note === 'string') return payload.note
  if ('title' in payload && typeof payload.title === 'string') return payload.title
  if ('task' in payload) return payload.task.title
  return ''
}

export const activity_timestamp = (date: Date = new Date()): string =>
  date.toISOString().replace(/\.\d{3}Z$/, 'Z')

export const mention_of = (mentions: Mention[], destinataire: string): Mention | null =>
  mentions.find((mention) => mention.destinataire === destinataire) ?? null

export const entity_ref = (id: string, label = id): EntityRef => ({
  id: id.trim(),
  label: label.trim() || id.trim()
})

export const medium_to_channel = (medium: string): CommunicationChannel | null => {
  switch (medium) {
    case 'rcs':
    case 'sms':
    case 'email':
      return medium
    case 'courrier':
    case 'letter':
    case 'postal_letter':
      return 'postal_letter'
    case 'lrar':
    case 'postal_registered_letter_with_acknowledgement':
      return 'postal_registered_letter_with_acknowledgement'
    case 'ere':
    case 'electronic_registered_delivery':
      return 'electronic_registered_delivery'
    case 'lre':
    case 'electronic_registered_letter':
      return 'electronic_registered_letter'
    default:
      return is_communication_channel(medium) ? medium : null
  }
}

export type Activite = {
  id: number
  date_creation: string
  rattachement: string
  auteur: string
  destinataire?: string | null
  id_client: string | null
  id_locataire: string | null
  id_lot: string | null
  type: ActivityType
  channel: CommunicationChannel | null
  mentions: Mention[]
  contenu: string
  thread_id?: string | null
  revision?: number | null
  bulk_id?: string | null
  execution_id?: string | null
  idempotency_key?: string | null
}

export type ActiviteListItem = Activite & {
  my: Mention | null
  read: boolean
  reaction: string | null
}

export type CreateActivityBody = {
  contexte: ActivityContext
  ref: string
  type: ActivityType
  channel?: CommunicationChannel | null
  auteur?: string
  destinataire?: string | null
  recipients?: string[]
  contenu?: string
  thread_id?: string | null
  bulk_id?: string | null
  execution_id?: string | null
  idempotency_key?: string | null
}

export type ActivityPatch =
  | { operation: 'edit_content'; contenu: string }
  | { operation: 'set_evaluation'; score: number | null; commentaire?: string | null }
  | {
      operation: 'update_action'
      action: string
      assigne_a: string
      date_echeance: string
      note?: string
    }
  | { operation: 'complete_action'; resultat?: string }
  | {
      operation: 'reopen_action'
      assigne_a: string
      date_echeance: string
      note?: string
    }
  | { operation: 'ignore_action'; motif?: string }
  | { operation: 'withdraw_note' }
  | { operation: 'set_mention'; lu?: boolean }
  | { operation: 'set_boost'; emoji: string | null }
  | { operation: 'save_repayment_plan'; contenu: string }
  | { operation: 'finalize_repayment_plan'; contenu: string }
  | { operation: 'close_repayment_plan'; reason: RepaymentPlanCloseReason }

export type GetActivitiesParams = {
  url: string
  rattachement?: string
  contexte?: ActivityContext
  ref?: string
  inbox?: boolean
  unread_only?: boolean
  auteurs?: string[]
  id_client?: string
  id_locataire?: string
  id_lot?: string
  type?: string
  current_threads?: boolean
  state?: TaskState
  limit?: number
  offset?: number
}

export type GetActivityFeedSyncParams = {
  url: string
  auteurs: string[]
  unread_only: boolean
  inbox_limit: number
  authored_limit: number
  etag?: string
}

export type ActivityFeedSyncData = {
  notifications: ActiviteListItem[]
  authored: ActiviteListItem[]
}

export type ActivityFeedSyncResult =
  | { notModified: true; etag: string }
  | { notModified: false; etag: string; data: ActivityFeedSyncData }

export type CreateActivityPayload = { url: string } & CreateActivityBody
export type PatchActivityPayload = { url: string; id: number; patch: ActivityPatch }
export type DeleteActivityPayload = { url: string; id: number }
export type SendCommunicationPayload = {
  url: string
  idempotencyKey: string
  channel: CommunicationChannel
  contexte: ActivityContext
  ref: string
  destinataire: string
  contenu: {
    subject?: string
    body: string
    action?: string
    choix?: { id: string; label: string }[]
  }
}
export type RecordExternalCommunicationPayload = {
  url: string
  idempotencyKey: string
  channel: CommunicationChannel
  contexte: ActivityContext
  ref: string
  destinataire?: string
  imported?: true
  contenu: {
    subject?: string
    body: string
    sender?: string
    action?: string
    choix?: { id: string; label: string }[]
    tenant_reply?: true
    external_application?: { name: string }
  }
}

export type ActivitiesListResponse = { data: ActiviteListItem[] }
export type ActivityResponse = { data: Activite }
export type DeleteActivityResponse = { data: { deleted: true } }
