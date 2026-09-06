import type { TodoSentencePart } from '@/shared/lib/activities/action-activity'
import {
  formatTimelineMessageBodyPlain,
  parseTimelineMessageBody,
  type TimelineMessageBody
} from '@/shared/lib/timeline/parse-timeline-message-body'
import { COMMUNICATION_TYPES, activity_payload, type Activite } from '@/shared/types/activites'

export type { TimelineMessageBody }
export { formatTimelineMessageBodyPlain, parseTimelineMessageBody }

const COMMUNICATION_TYPE_SET = new Set<string>(COMMUNICATION_TYPES)

/** Libellé d’action porté par un envoi (frontmatter `action`). */
export function parseTimelineOutboundAction(row: Activite): string | null {
  if (!COMMUNICATION_TYPE_SET.has(row.type)) return null
  const payload = activity_payload(row.type, row.contenu)
  const action = typeof payload['action'] === 'string' ? payload['action'].trim() : ''
  return action || null
}

/** Médium de l’envoi — `type` d’activité (`email`, `rcs`, …). `mailto` n’est pas un type. */
export function outboundChannelPhrase(type: Activite['type']): string | null {
  if (type === 'email') return 'par e-mail'
  if (type === 'rcs') return 'par RCS'
  if (type === 'sms') return 'par SMS'
  if (type === 'courrier') return 'par courrier'
  if (type === 'lrar') return 'par lettre recommandée'
  if (type === 'lre') return 'par lettre recommandée électronique'
  if (type === 'signature') return 'par signature électronique'
  return null
}

/** Phrase L2 d’un envoi : « a [action] par … [(via un traitement de masse)] ». */
export function outboundActionSentenceParts(
  action: string | null,
  type: Activite['type'],
  bulkId?: string | null
): TodoSentencePart[] {
  const medium = outboundChannelPhrase(type)
  return [
    { type: 'text', text: 'a' },
    ...(action ? [{ type: 'title' as const, text: action }] : []),
    ...(medium ? [{ type: 'text' as const, text: medium }] : []),
    ...(bulkId ? [{ type: 'text' as const, text: '(via un traitement de masse)' }] : [])
  ]
}
