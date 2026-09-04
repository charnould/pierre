export const ACTIVITY_CONTEXTS = [
  'tickets',
  'repayment',
  'automations',
  'bulk',
  'a_qualifier'
] as const
export type ActivityContext = (typeof ACTIVITY_CONTEXTS)[number]

export const COMMUNICATION_TYPES = [
  'rcs',
  'sms',
  'email',
  'courrier',
  'lrar',
  'lre',
  'signature'
] as const
export type CommunicationType = (typeof COMMUNICATION_TYPES)[number]

export const ACTIVITY_TYPES = [
  'note',
  ...COMMUNICATION_TYPES,
  'automation_report',
  'ticket_change',
  'case_assignment',
  'case_bucket_change',
  'case_tag_change',
  'ticket_memo',
  'ticket_summary',
  'ticket_reply',
  'repayment_plan',
  'repayment_plan_close',
  'action',
  'bulk_application',
  'bulk_no_route',
  'activity_boost',
  'bulk_run',
  'email_import'
] as const

export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export const ACTIVITY_STATUSES = [
  'draft',
  'logged',
  'received',
  'queued',
  'sent',
  'delivered',
  'read',
  'failed',
  'undelivered',
  'rejected',
  'bounced',
  'returned',
  'signed',
  'refused',
  'unclaimed',
  'expired'
] as const

export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number]

export type Mention = {
  destinataire: string
  lu: boolean
  boost: string | null
  /** `false` = entrée technique (boost) exclue de l’inbox. Absent = mention réelle. */
  inbox?: boolean
  /** Origine de la notification : mention textuelle ou assignation d'une action. */
  motif?: 'mention' | 'assignation'
}

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

export const ACTIVITY_CONTENT_VERSION = 1 as const

export type ActionActivityState = 'a_faire' | 'fait' | 'ignore'
export type ActionActivityEvent = 'created' | 'updated' | 'completed' | 'ignored' | 'reopened'

export type ActionActivityContent = {
  version: typeof ACTIVITY_CONTENT_VERSION
  action: string
  etat: ActionActivityState
  cree_par: string
  cree_le: string
  assigne_a?: string
  date_echeance?: string
  note?: string
  resultat?: string
  motif?: string
}

export type ActionActivityCreationContent = {
  version: typeof ACTIVITY_CONTENT_VERSION
  action: string
  etat: 'a_faire' | 'fait'
  assigne_a?: string
  date_echeance?: string
  note?: string
  resultat?: string
}

export type MessageActivityContent = {
  version: typeof ACTIVITY_CONTENT_VERSION
  note: string
  etat?: 'publie' | 'retire'
  date_retrait?: string
  retire_par?: string
}

const non_empty_string = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

export const parse_action_activity_content = (raw: string): ActionActivityContent | null => {
  const value = parse_contenu_json(raw)
  if (
    value['version'] !== ACTIVITY_CONTENT_VERSION ||
    !non_empty_string(value['action']) ||
    !['a_faire', 'fait', 'ignore'].includes(String(value['etat'])) ||
    !non_empty_string(value['cree_par']) ||
    !non_empty_string(value['cree_le'])
  ) {
    return null
  }

  const etat = value['etat'] as ActionActivityState
  if (
    (etat === 'a_faire' || etat === 'ignore') &&
    (!non_empty_string(value['assigne_a']) || !non_empty_string(value['date_echeance']))
  ) {
    return null
  }
  return {
    version: ACTIVITY_CONTENT_VERSION,
    action: value['action'].trim(),
    etat,
    cree_par: value['cree_par'],
    cree_le: value['cree_le'],
    ...(non_empty_string(value['assigne_a']) ? { assigne_a: value['assigne_a'] } : {}),
    ...(non_empty_string(value['date_echeance']) ? { date_echeance: value['date_echeance'] } : {}),
    ...(non_empty_string(value['note']) ? { note: value['note'] } : {}),
    ...(non_empty_string(value['resultat']) ? { resultat: value['resultat'] } : {}),
    ...(non_empty_string(value['motif']) ? { motif: value['motif'] } : {})
  }
}

export const parse_action_creation_content = (
  raw: string
): ActionActivityCreationContent | null => {
  const value = parse_contenu_json(raw)
  if (
    value['version'] !== ACTIVITY_CONTENT_VERSION ||
    !non_empty_string(value['action']) ||
    !['a_faire', 'fait'].includes(String(value['etat']))
  ) {
    return null
  }
  const etat = value['etat'] as 'a_faire' | 'fait'
  if (
    etat === 'a_faire' &&
    (!non_empty_string(value['assigne_a']) || !non_empty_string(value['date_echeance']))
  ) {
    return null
  }
  return {
    version: ACTIVITY_CONTENT_VERSION,
    action: value['action'].trim(),
    etat,
    ...(non_empty_string(value['assigne_a']) ? { assigne_a: value['assigne_a'] } : {}),
    ...(non_empty_string(value['date_echeance']) ? { date_echeance: value['date_echeance'] } : {}),
    ...(non_empty_string(value['note']) ? { note: value['note'] } : {}),
    ...(non_empty_string(value['resultat']) ? { resultat: value['resultat'] } : {})
  }
}

export type CaseTagChangeContent = {
  version: typeof ACTIVITY_CONTENT_VERSION
  tags: string[]
  tags_precedents: string[]
  note?: string
}

export type CaseBucketChangeContent = {
  version: typeof ACTIVITY_CONTENT_VERSION
  bucket: string
  bucket_precedent: string | null
  note?: string
}

export type CaseAssignmentContent = {
  version: typeof ACTIVITY_CONTENT_VERSION
  referent: string
  referent_precedent: string | null
  login?: string
  note?: string
}

const parse_tag_labels = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null
  const tags: string[] = []
  for (const entry of value) {
    if (typeof entry !== 'string') return null
    const trimmed = entry.trim()
    if (!trimmed) return null
    if (!tags.includes(trimmed)) tags.push(trimmed)
  }
  return tags
}

export const parse_case_tag_change_content = (raw: string): CaseTagChangeContent | null => {
  const value = parse_contenu_json(raw)
  if (value['version'] !== ACTIVITY_CONTENT_VERSION) return null
  const tags = parse_tag_labels(value['tags'])
  if (tags == null) return null
  const precedentsRaw = value['tags_precedents']
  const tags_precedents = precedentsRaw === undefined ? [] : parse_tag_labels(precedentsRaw)
  if (tags_precedents == null) return null
  return {
    version: ACTIVITY_CONTENT_VERSION,
    tags,
    tags_precedents,
    ...(non_empty_string(value['note']) ? { note: value['note'].trim() } : {})
  }
}

export const parse_case_bucket_change_content = (raw: string): CaseBucketChangeContent | null => {
  const value = parse_contenu_json(raw)
  if (value['version'] !== ACTIVITY_CONTENT_VERSION || !non_empty_string(value['bucket'])) {
    return null
  }
  const previous = value['bucket_precedent']
  if (previous !== null && previous !== undefined && typeof previous !== 'string') return null
  return {
    version: ACTIVITY_CONTENT_VERSION,
    bucket: value['bucket'].trim(),
    bucket_precedent: typeof previous === 'string' && previous.trim() ? previous.trim() : null,
    ...(non_empty_string(value['note']) ? { note: value['note'].trim() } : {})
  }
}

export const parse_case_assignment_content = (raw: string): CaseAssignmentContent | null => {
  const value = parse_contenu_json(raw)
  if (value['version'] !== ACTIVITY_CONTENT_VERSION || !non_empty_string(value['referent'])) {
    return null
  }
  const previous = value['referent_precedent']
  if (previous !== null && previous !== undefined && typeof previous !== 'string') return null
  return {
    version: ACTIVITY_CONTENT_VERSION,
    referent: value['referent'].trim(),
    referent_precedent: typeof previous === 'string' && previous.trim() ? previous.trim() : null,
    ...(non_empty_string(value['login']) ? { login: value['login'].trim().toLowerCase() } : {}),
    ...(non_empty_string(value['note']) ? { note: value['note'].trim() } : {})
  }
}

export const parse_message_activity_content = (raw: string): MessageActivityContent | null => {
  const value = parse_contenu_json(raw)
  if (value['version'] !== ACTIVITY_CONTENT_VERSION || typeof value['note'] !== 'string') {
    return null
  }
  return {
    version: ACTIVITY_CONTENT_VERSION,
    note: value['note'],
    ...(value['etat'] === 'retire'
      ? {
          etat: 'retire' as const,
          ...(non_empty_string(value['date_retrait'])
            ? { date_retrait: value['date_retrait'] }
            : {}),
          ...(non_empty_string(value['retire_par']) ? { retire_par: value['retire_par'] } : {})
        }
      : { etat: 'publie' as const })
  }
}

/** Returns only canonical, versioned activity content. */
export const activity_payload = (_type: ActivityType, raw: string): Record<string, unknown> => {
  const parsed = parse_contenu_json(raw)
  return parsed['version'] === ACTIVITY_CONTENT_VERSION ? parsed : {}
}

export const activity_texte = (type: ActivityType, raw: string): string => {
  const payload = activity_payload(type, raw)
  if (typeof payload['note'] === 'string') return payload['note']
  if (typeof payload['corps'] === 'string') return payload['corps']
  if (typeof payload['contenu'] === 'string') return payload['contenu']
  return typeof payload['titre'] === 'string' ? payload['titre'] : ''
}

export const activity_timestamp = (date: Date = new Date()): string =>
  date.toISOString().replace(/\.\d{3}Z$/, 'Z')

export const mention_of = (mentions: Mention[], destinataire: string): Mention | null =>
  mentions.find((mention) => mention.destinataire === destinataire) ?? null

export const is_inbox_mention = (mention: Mention): boolean => mention.inbox !== false

export const is_boost_notification = (type: ActivityType): boolean => type === 'activity_boost'

export type Activite = {
  id: number
  date_creation: string
  date_statut?: string
  rattachement: string
  auteur: string
  destinataire?: string | null
  id_client: string | null
  id_locataire: string | null
  id_lot: string | null
  type: ActivityType
  statut: ActivityStatus | null
  mentions: Mention[]
  contenu: string
  thread_id?: string | null
  event?: ActionActivityEvent | null
  state?: ActionActivityState | null
  revision?: number | null
  bulk_id?: string | null
  execution_id?: string | null
  idempotency_key?: string | null
}

export type ActiviteListItem = Activite & {
  my: Mention | null
}

export type CreateActivityBody = {
  contexte: ActivityContext
  ref: string
  type: ActivityType
  statut?: ActivityStatus | null
  auteur?: string
  destinataire?: string | null
  recipients?: string[]
  contenu?: string
  bulk_id?: string | null
  execution_id?: string | null
  idempotency_key?: string | null
}

export type ActivityPatch =
  | { operation: 'edit_content'; titre?: string | null; contenu: string }
  | {
      operation: 'set_evaluation'
      score: number | null
      commentaire?: string | null
    }
  | { operation: 'set_status'; statut: ActivityStatus }
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
  | { operation: 'set_mention'; lu?: boolean; boost?: string | null }
  | { operation: 'set_boost'; emoji: string | null }

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
  statut?: string
  current_threads?: boolean
  state?: ActionActivityState
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
  type: CommunicationType
  contexte: ActivityContext
  ref: string
  destinataire: string
  contenu: {
    objet?: string
    corps: string
    action?: string
    choix?: { id: string; label: string }[]
  }
}
export type RecordExternalCommunicationPayload = {
  url: string
  idempotencyKey: string
  canal: CommunicationType
  contexte: ActivityContext
  ref: string
  destinataire?: string
  contenu: {
    objet?: string
    corps: string
    action?: string
    choix?: { id: string; label: string }[]
    tenant_reply?: true
    external_application?: { name: string }
  }
}

export type ActivitiesListResponse = { data: ActiviteListItem[] }
export type ActivityResponse = { data: Activite }
export type DeleteActivityResponse = { data: { deleted: true } }
