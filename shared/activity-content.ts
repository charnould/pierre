import {
  type ActivityType,
  type ActivityValue,
  type EntityRef,
  isActivityMetaType,
  isCaseChangeType,
  isCommunicationOpenedType,
  isCommunicationStatusType,
  isNoteType,
  isSignatureType,
  isTaskType,
  isTitledType,
  type TaskState
} from './activities'
import { parse_stored_choices, type RcsChoice } from './rcs-message'
import {
  isRepaymentPlanEventType,
  parseRepaymentPlanContent,
  type RepaymentPlanCase
} from './repayment-plan'

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
  choices?: RcsChoice[]
  sms_fallback?: string
  provider?: string
  purpose?: 'general' | 'payment_plan' | 'bulk'
  related_id?: string
  fallback_from?: string
}

export type CommunicationStatusContent = {
  version: 2
  result?: 'sent' | 'delivered' | 'read' | 'opened'
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
  | RepaymentPlanCase

export const parseContentJson = (raw: string): Record<string, unknown> => {
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Activity content must be a JSON object')
  }
  return value as Record<string, unknown>
}

const nonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const asString = (value: unknown): string | undefined =>
  nonEmptyString(value) ? value.trim() : undefined

const hasOnlyKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).every((key) => keys.includes(key))

const parseEntityRef = (value: unknown): EntityRef | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (!hasOnlyKeys(record, ['id', 'label'])) return null
  if (!nonEmptyString(record['id']) || !nonEmptyString(record['label'])) return null
  return { id: record['id'].trim(), label: record['label'].trim() }
}

const parseActivityValue = (value: unknown): ActivityValue | undefined => {
  if (value === null) return null
  if (typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    if (value.every((entry) => typeof entry === 'string')) return value
    const refs = value.map(parseEntityRef)
    if (refs.every((entry): entry is EntityRef => entry != null)) return refs
    return undefined
  }
  return parseEntityRef(value) ?? undefined
}

const parseTaskSnapshot = (value: unknown): TaskSnapshot | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (!hasOnlyKeys(record, ['title', 'state', 'assignee', 'due_date'])) return null
  if (!nonEmptyString(record['title'])) return null
  if (!['open', 'completed', 'ignored', 'deleted'].includes(String(record['state']))) return null
  const assignee = record['assignee'] === undefined ? undefined : parseEntityRef(record['assignee'])
  if (record['assignee'] !== undefined && !assignee) return null
  return {
    title: record['title'].trim(),
    state: record['state'] as TaskState,
    ...(assignee ? { assignee } : {}),
    ...(asString(record['due_date']) ? { due_date: asString(record['due_date']) } : {})
  }
}

export const parseNoteContent = (raw: string): NoteContent | null => {
  const value = parseContentJson(raw)
  if (!hasOnlyKeys(value, ['version', 'text'])) return null
  if (value['version'] !== 2) return null
  const text = value['text']
  if (text !== undefined && typeof text !== 'string') return null
  return { version: 2, ...(typeof text === 'string' ? { text } : {}) }
}

export const parseTaskContent = (raw: string): TaskContent | null => {
  const value = parseContentJson(raw)
  if (!hasOnlyKeys(value, ['version', 'task', 'changes', 'note', 'result', 'reason'])) return null
  if (value['version'] !== 2) return null
  const task = parseTaskSnapshot(value['task'])
  if (!task) return null
  const changes = value['changes']
  if (changes !== undefined) {
    if (!Array.isArray(changes)) return null
    for (const change of changes) {
      if (!change || typeof change !== 'object' || Array.isArray(change)) return null
      const record = change as Record<string, unknown>
      if (!hasOnlyKeys(record, ['field', 'before', 'after'])) return null
      if (!['title', 'assignee', 'due_date', 'note'].includes(String(record['field']))) return null
      if (parseActivityValue(record['before']) === undefined) return null
      if (parseActivityValue(record['after']) === undefined) return null
    }
  }
  return {
    version: 2,
    task,
    ...(Array.isArray(changes) ? { changes: changes as TaskChange[] } : {}),
    ...(asString(value['note']) ? { note: asString(value['note']) } : {}),
    ...(asString(value['result']) ? { result: asString(value['result']) } : {}),
    ...(asString(value['reason']) ? { reason: asString(value['reason']) } : {})
  }
}

const parseCaseChange = (raw: string, withField: boolean): CaseChangeContent | null => {
  const value = parseContentJson(raw)
  const keys = withField
    ? ['version', 'field', 'before', 'after', 'note']
    : ['version', 'before', 'after', 'note']
  if (!hasOnlyKeys(value, keys)) return null
  if (value['version'] !== 2) return null
  const before = parseActivityValue(value['before'])
  const after = parseActivityValue(value['after'])
  if (before === undefined || after === undefined) return null
  return {
    version: 2,
    before,
    after,
    ...(asString(value['note']) ? { note: asString(value['note']) } : {})
  }
}

export const parseCaseChangeContent = (raw: string): CaseChangeContent | null =>
  parseCaseChange(raw, false)

const parseTicketChangeContent = (raw: string): TicketChangeContent | null => {
  const parsed = parseCaseChange(raw, true)
  const field = asString(parseContentJson(raw)['field'])
  if (!parsed || !field) return null
  return { ...parsed, field }
}

export const parseCommunicationOpenedContent = (raw: string): CommunicationOpenedContent | null => {
  const value = parseContentJson(raw)
  if (
    !hasOnlyKeys(value, [
      'version',
      'sender',
      'subject',
      'body',
      'action',
      'choices',
      'sms_fallback',
      'provider',
      'purpose',
      'related_id',
      'fallback_from'
    ])
  ) {
    return null
  }
  if (
    value['version'] !== 2 ||
    !nonEmptyString(value['sender']) ||
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
  const choices = parse_stored_choices(value['choices'])
  if (!choices) return null
  const sms_fallback = asString(value['sms_fallback'])
  return {
    version: 2,
    sender: value['sender'].trim(),
    body: value['body'],
    ...(asString(value['subject']) ? { subject: asString(value['subject']) } : {}),
    ...(asString(value['action']) ? { action: asString(value['action']) } : {}),
    ...(choices.length ? { choices } : {}),
    ...(sms_fallback ? { sms_fallback } : {}),
    ...(asString(value['provider']) ? { provider: asString(value['provider']) } : {}),
    ...(purpose ? { purpose } : {}),
    ...(asString(value['related_id']) ? { related_id: asString(value['related_id']) } : {}),
    ...(asString(value['fallback_from']) ? { fallback_from: asString(value['fallback_from']) } : {})
  }
}

export const parseCommunicationStatusContent = (raw: string): CommunicationStatusContent | null => {
  const value = parseContentJson(raw)
  if (!hasOnlyKeys(value, ['version', 'result', 'reason', 'provider_event_id'])) return null
  if (value['version'] !== 2) return null
  const result = value['result']
  if (
    result !== undefined &&
    result !== 'sent' &&
    result !== 'delivered' &&
    result !== 'read' &&
    result !== 'opened'
  ) {
    return null
  }
  return {
    version: 2,
    ...(result ? { result } : {}),
    ...(asString(value['reason']) ? { reason: asString(value['reason']) } : {}),
    ...(asString(value['provider_event_id'])
      ? { provider_event_id: asString(value['provider_event_id']) }
      : {})
  }
}

export const parseActivityMetaContent = (raw: string): ActivityMetaContent | null => {
  const value = parseContentJson(raw)
  if (!hasOnlyKeys(value, ['version', 'source_activity_id', 'emoji'])) return null
  if (value['version'] !== 2 || typeof value['source_activity_id'] !== 'number') return null
  return {
    version: 2,
    source_activity_id: value['source_activity_id'],
    ...(asString(value['emoji']) ? { emoji: asString(value['emoji']) } : {})
  }
}

export const parseTitledContent = (raw: string): TitledContent | null => {
  const value = parseContentJson(raw)
  if (!hasOnlyKeys(value, ['version', 'title', 'values', 'note'])) return null
  if (value['version'] !== 2 || !nonEmptyString(value['title'])) return null
  const values = value['values']
  if (values !== undefined) {
    if (!values || typeof values !== 'object' || Array.isArray(values)) return null
    for (const entry of Object.values(values as Record<string, unknown>)) {
      if (parseActivityValue(entry) === undefined) return null
    }
  }
  return {
    version: 2,
    title: value['title'].trim(),
    ...(values ? { values: values as Record<string, ActivityValue> } : {}),
    ...(asString(value['note']) ? { note: asString(value['note']) } : {})
  }
}

export const parseSignatureContent = (raw: string): SignatureContent | null => {
  const value = parseContentJson(raw)
  if (
    !hasOnlyKeys(value, [
      'version',
      'document',
      'provider',
      'signers',
      'signer',
      'signed_document_id',
      'evidence_id',
      'related_plan_id',
      'method',
      'reason'
    ])
  ) {
    return null
  }
  if (value['version'] !== 2 || !value['document'] || typeof value['document'] !== 'object') {
    return null
  }
  const document = value['document'] as Record<string, unknown>
  if (!hasOnlyKeys(document, ['id', 'type', 'title', 'version', 'hash'])) return null
  if (
    !nonEmptyString(document['id']) ||
    !nonEmptyString(document['type']) ||
    !nonEmptyString(document['title']) ||
    !nonEmptyString(document['version'])
  ) {
    return null
  }
  if (!Array.isArray(value['signers'])) return null
  const signers: SignatureContent['signers'] = []
  for (const entry of value['signers']) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null
    const record = entry as Record<string, unknown>
    if (!hasOnlyKeys(record, ['id', 'label', 'role', 'order', 'status'])) return null
    if (
      !nonEmptyString(record['id']) ||
      !nonEmptyString(record['label']) ||
      !['pending', 'signed', 'refused'].includes(String(record['status']))
    ) {
      return null
    }
    signers.push({
      id: record['id'].trim(),
      label: record['label'].trim(),
      status: record['status'] as 'pending' | 'signed' | 'refused',
      ...(asString(record['role']) ? { role: asString(record['role']) } : {}),
      ...(typeof record['order'] === 'number' ? { order: record['order'] } : {})
    })
  }
  const signer = value['signer'] === undefined ? undefined : parseEntityRef(value['signer'])
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
      ...(asString(document['hash']) ? { hash: asString(document['hash']) } : {})
    },
    signers,
    ...(asString(value['provider']) ? { provider: asString(value['provider']) } : {}),
    ...(signer ? { signer } : {}),
    ...(asString(value['signed_document_id'])
      ? { signed_document_id: asString(value['signed_document_id']) }
      : {}),
    ...(asString(value['evidence_id']) ? { evidence_id: asString(value['evidence_id']) } : {}),
    ...(asString(value['related_plan_id'])
      ? { related_plan_id: asString(value['related_plan_id']) }
      : {}),
    ...(method ? { method } : {}),
    ...(asString(value['reason']) ? { reason: asString(value['reason']) } : {})
  }
}

export const parseActivityContent = (type: string, raw: string): ActivityContent | null => {
  try {
    if (isNoteType(type)) return parseNoteContent(raw)
    if (isTaskType(type)) return parseTaskContent(raw)
    if (isCaseChangeType(type)) return parseCaseChangeContent(raw)
    if (type === 'ticket.field_changed') return parseTicketChangeContent(raw)
    if (isCommunicationOpenedType(type)) return parseCommunicationOpenedContent(raw)
    if (isCommunicationStatusType(type)) return parseCommunicationStatusContent(raw)
    if (isActivityMetaType(type)) return parseActivityMetaContent(raw)
    if (isRepaymentPlanEventType(type)) return parseRepaymentPlanContent(type, raw)
    if (isTitledType(type)) return parseTitledContent(raw)
    if (isSignatureType(type)) return parseSignatureContent(raw)
    return null
  } catch {
    return null
  }
}

export const activityPayload = (type: ActivityType, raw: string): Record<string, unknown> => {
  const parsed = parseActivityContent(type, raw)
  if (!parsed) throw new Error(`Invalid ${type} content`)
  return parsed as unknown as Record<string, unknown>
}

export const activityText = (type: ActivityType, raw: string): string => {
  const payload = parseActivityContent(type, raw)
  if (!payload) throw new Error(`Invalid ${type} content`)
  if ('text' in payload && typeof payload.text === 'string') return payload.text
  if ('body' in payload && typeof payload.body === 'string') return payload.body
  if ('note' in payload && typeof payload.note === 'string') return payload.note
  if ('title' in payload && typeof payload.title === 'string') return payload.title
  if ('task' in payload) return payload.task.title
  return ''
}
