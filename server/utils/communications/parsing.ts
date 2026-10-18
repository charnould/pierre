import { Database } from 'bun:sqlite'

import {
  type Activite,
  type ActivityContext,
  activity_timestamp,
  is_communication_type
} from '../../../shared/activites'
import { get_activity, get_activity_with_db, parse_rattachement } from '../activities/rows'
import { readProviders } from '../providers'
import { datastore_path } from './storage'

export const communication_from_reference = (reference: string): Activite | null => {
  const value = reference.trim()
  if (!value) return null
  if (/^[1-9]\d*$/.test(value)) {
    const id = Number(value)
    if (Number.isSafeInteger(id)) {
      const activity = get_activity(id)
      if (activity && is_communication_type(activity.type)) return activity
    }
  }
  const db = new Database(datastore_path(), { readonly: true })
  try {
    const row = db
      .query<{ id: number }, [string]>(
        `SELECT id FROM activites
         WHERE id_externe = ? AND type LIKE 'communication.%'
         ORDER BY id DESC LIMIT 1`
      )
      .get(value)
    return row ? get_activity_with_db(db, row.id) : null
  } finally {
    db.close()
  }
}

export const communication_reference = (activityId: number): string => String(activityId)

export const next_status_timestamp = (activity: Activite, now: Date = new Date()): string => {
  const current = new Date(activity.date_creation).getTime()
  return new Date(Math.max(now.getTime(), current + 1)).toISOString()
}

export const find_recent_thread = (
  type: 'rcs' | 'sms' | 'email' | 'mobile',
  sender: string,
  now: Date = new Date()
): {
  contexte: ActivityContext
  ref: string
  thread_id: string
  id_locataire: string | null
} | null => {
  const cutoff = activity_timestamp(new Date(now.getTime() - 72 * 60 * 60 * 1000))
  const channels = type === 'mobile' ? ['rcs', 'sms'] : [type]
  const marks = channels.map(() => '?').join(', ')
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
        Array<string>
      >(
        `SELECT a.rattachement, a.thread_id, MAX(a.id_locataire) AS id_locataire,
                MAX(a.date_creation) AS last_message_at
         FROM activites a
         WHERE a.channel IN (${marks})
           AND a.thread_id IN (
             SELECT thread_id FROM activites
             WHERE channel IN (${marks}) AND destinataire = ? AND thread_id IS NOT NULL
           )
           AND a.rattachement NOT LIKE 'a_qualifier:%'
         GROUP BY a.rattachement, a.thread_id
         HAVING MAX(a.date_creation) >= ?
         ORDER BY last_message_at DESC, MAX(a.id) DESC
         LIMIT 1`
      )
      .all(...channels, ...channels, sender, cutoff)
    const row = rows[0]
    if (!row) return null
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
  const expected = readProviders().rcsSecret
  return Boolean(expected && header === expected)
}
