import { Database } from 'bun:sqlite'

import {
  COMMUNICATION_TYPES,
  type Activite,
  type ActivityContext,
  type ActivityType,
  type CommunicationType,
  activity_timestamp
} from '../../../shared/activites'
import { get_activity, parse_rattachement } from '../activities/rows'
import { datastore_path } from './storage'

export const communication_from_reference = (reference: string): Activite | null => {
  const match = /^p([1-9]\d*)$/.exec(reference)
  if (!match) return null
  const id = Number(match[1])
  if (!Number.isSafeInteger(id)) return null
  const activity = get_activity(id)
  return activity && (COMMUNICATION_TYPES as readonly ActivityType[]).includes(activity.type)
    ? activity
    : null
}

export const communication_reference = (activityId: number): string => `p${activityId}`

export const next_status_timestamp = (activity: Activite, now: Date = new Date()): string => {
  const current = new Date(activity.date_statut ?? activity.date_creation).getTime()
  return new Date(Math.max(now.getTime(), current + 1)).toISOString()
}

export const find_recent_thread = (
  type: Extract<CommunicationType, 'rcs' | 'email'>,
  sender: string,
  now: Date = new Date()
): {
  contexte: ActivityContext
  ref: string
  thread_id: string
  id_locataire: string | null
} | null => {
  const cutoff = activity_timestamp(new Date(now.getTime() - 72 * 60 * 60 * 1000))
  const db = new Database(datastore_path(), { readonly: true })
  try {
    const rows = db
      .query<
        {
          rattachement: string
          thread_id: string
          id_locataire: string | null
          last_message_at: string
        },
        [string, string, string, string]
      >(
        `SELECT a.rattachement, a.thread_id, MAX(a.id_locataire) AS id_locataire,
                MAX(a.date_creation) AS last_message_at
         FROM activites a
         WHERE a.type = ?
           AND a.thread_id IN (
             SELECT thread_id FROM activites
             WHERE type = ? AND destinataire = ? AND thread_id IS NOT NULL
           )
           AND a.rattachement NOT LIKE 'a_qualifier:%'
         GROUP BY a.rattachement, a.thread_id
         HAVING MAX(a.date_creation) >= ?`
      )
      .all(type, type, sender, cutoff)
    if (rows.length !== 1) return null
    const row = rows[0]!
    const parsed = parse_rattachement(row.rattachement)
    if (!parsed) return null
    return {
      contexte: parsed.contexte,
      ref: parsed.ref,
      thread_id: row.thread_id,
      id_locataire: row.id_locataire
    }
  } finally {
    db.close()
  }
}

/** Header CM.com `Webhook-Secret` — obligatoire (secret vide ou mismatch → rejet). */
export const cm_webhook_authorized = (header: string | undefined): boolean => {
  const expected = Bun.env['CM_WEBHOOK_SECRET']?.trim()
  return Boolean(expected && header === expected)
}
