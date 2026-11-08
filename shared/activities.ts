import type { RcsContenu } from './rcs-message'

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

/** Canaux qu’un client peut envoyer ou journaliser. `sms` n’existe qu’en fallback serveur. */
export type SubmittableChannel = Exclude<CommunicationChannel, 'sms'>
export const SUBMITTABLE_CHANNELS = COMMUNICATION_CHANNELS.filter(
  (channel): channel is SubmittableChannel => channel !== 'sms'
) as [SubmittableChannel, ...SubmittableChannel[]]

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
  'activity.unread',
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
  'bulk.completed',
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
const META_TYPES = new Set<string>([
  'activity.read',
  'activity.unread',
  'activity.reaction_changed'
])
const TITLED_TYPES = new Set<string>([
  'artifact.generated',
  'artifact.regenerated',
  'artifact.finalized',
  'artifact.discarded',
  'artifact.feedback_recorded',
  'automation.reported',
  'bulk.ran',
  'bulk.completed',
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

export const isActivityType = (value: string): value is ActivityType =>
  (ACTIVITY_TYPES as readonly string[]).includes(value)

const isCommunicationChannel = (value: string): value is CommunicationChannel =>
  (COMMUNICATION_CHANNELS as readonly string[]).includes(value)

export const isCommunicationType = (type: string): boolean => COMMUNICATION_TYPES.has(type)

export const isCommunicationOpenedType = (type: string): boolean =>
  COMMUNICATION_OPENED_TYPES.has(type)

export const isCommunicationStatusType = (type: string): boolean =>
  COMMUNICATION_STATUS_TYPES.has(type)

export const isNoteType = (type: string): boolean => NOTE_TYPES.has(type)

export const isTaskType = (type: string): boolean => TASK_TYPES.has(type)

export const isCaseChangeType = (type: string): boolean => CASE_CHANGE_TYPES.has(type)

export const isSignatureType = (type: string): boolean => SIGNATURE_TYPES.has(type)

export const isActivityMetaType = (type: string): boolean => META_TYPES.has(type)

export const isTitledType = (type: string): boolean => TITLED_TYPES.has(type)

export const isHiddenTimelineType = (type: string): boolean =>
  META_TYPES.has(type) || COMMUNICATION_STATUS_TYPES.has(type) || type === 'bulk.completed'

export const communicationChannelLabel = (channel: CommunicationChannel): string =>
  COMMUNICATION_CHANNEL_LABELS[channel]

export const activityTimestamp = (date: Date = new Date()): string =>
  date.toISOString().replace(/\.\d{3}Z$/, 'Z')

export const mentionOf = (mentions: Mention[], destinataire: string): Mention | null =>
  mentions.find((mention) => mention.destinataire === destinataire) ?? null

export const entityRef = (id: string, label = id): EntityRef => ({
  id: id.trim(),
  label: label.trim() || id.trim()
})

export const mediumToChannel = (medium: string): CommunicationChannel | null => {
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
      return isCommunicationChannel(medium) ? medium : null
  }
}

export type Activity = {
  id: number
  createdAt: string
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
  threadId?: string | null
  revision?: number | null
  bulkId?: string | null
  executionId?: string | null
  idempotencyKey?: string | null
  externalId?: string | null
}

export type ActivityListItem = Activity & {
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
  threadId?: string | null
  bulkId?: string | null
  executionId?: string | null
  idempotencyKey?: string | null
}

export type ActivityPatch =
  | { operation: 'edit_content'; contenu: string }
  | { operation: 'set_evaluation'; score: number | null; commentaire?: string | null }
  | {
      operation: 'update_action'
      action: string
      assigneA: string
      dateEcheance: string
      note?: string
    }
  | { operation: 'complete_action'; resultat?: string }
  | {
      operation: 'reopen_action'
      assigneA: string
      dateEcheance: string
      note?: string
    }
  | { operation: 'ignore_action'; motif?: string }
  | { operation: 'withdraw_note' }
  | { operation: 'set_mention'; lu?: boolean }
  | { operation: 'set_boost'; emoji: string | null }
  | { operation: 'save_repayment_plan'; contenu: string }

export type GetActivitiesParams = {
  url: string
  rattachement?: string
  contexte?: ActivityContext
  ref?: string
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
}

export type GetActivityFeedSyncParams = {
  url: string
  auteurs: string[]
  unreadOnly: boolean
  inboxLimit: number
  authoredLimit: number
  etag?: string
}

export type ActivityFeedSyncData = {
  notifications: ActivityListItem[]
  authored: ActivityListItem[]
}

export type ActivityFeedSyncResult =
  | { notModified: true; etag: string }
  | { notModified: false; etag: string; data: ActivityFeedSyncData }

export type CreateActivityPayload = { url: string } & CreateActivityBody
export type PatchActivityPayload = { url: string; id: number; patch: ActivityPatch }
export type DeleteActivityPayload = { url: string; id: number }
type SendCommunicationBase = {
  url: string
  idempotencyKey: string
  contexte: ActivityContext
  ref: string
}

export type PostalAddress = {
  line1?: string
  line2?: string
  line3?: string
  line4?: string
  line5?: string
  line6: string
  country: string
}

export type ElectronicRecipient = {
  email: string
  legalStatus: 'PROFESSIONAL' | 'INDIVIDUAL'
  firstName?: string
  lastName?: string
  company?: string
}

export type MailDocument = {
  name: string
  mediaType:
    'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  contentBase64: string
}

export type ConsentProof = {
  reference: string
  grantedAt: string
  source: string
}

type MailContent = { subject?: string; body: string; action?: string }

export type SendCommunicationPayload = SendCommunicationBase &
  (
    | { channel: 'rcs'; destinataire: string; contenu: RcsContenu }
    | { channel: 'email'; destinataire: string; contenu: MailContent }
    | {
        channel: 'postal_letter' | 'postal_registered_letter_with_acknowledgement'
        destinataire: PostalAddress
        document: MailDocument
        contenu: MailContent
      }
    | {
        channel: 'electronic_registered_delivery'
        destinataire: ElectronicRecipient
        document: MailDocument
        contenu: MailContent
      }
    | {
        channel: 'electronic_registered_letter'
        destinataire: ElectronicRecipient
        document: MailDocument
        consent?: ConsentProof
        contenu: MailContent
      }
  )

export type RecordExternalCommunicationPayload = {
  url: string
  idempotencyKey: string
  contexte: ActivityContext
  ref: string
  destinataire?: string
  imported?: true
} & (
  | {
      channel: 'rcs'
      contenu: RcsContenu & { sender?: string; externalApplication?: { name: string } }
    }
  | {
      channel: Exclude<SubmittableChannel, 'rcs'>
      contenu: {
        body: string
        subject?: string
        sender?: string
        action?: string
        externalApplication?: { name: string }
      }
    }
)

export type ActivitiesListResponse = { data: ActivityListItem[] }
export type ActivityResponse = { data: Activity }
export type SendCommunicationResponse =
  ActivityResponse | { error: { code: string; message: string }; data?: Activity }
export type DeleteActivityResponse = { data: { deleted: true } }
