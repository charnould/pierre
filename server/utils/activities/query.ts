import { Database } from 'bun:sqlite'

import {
  type ActiviteListItem,
  mention_of,
  parse_activity_meta_content
} from '../../../shared/activites'
import { sql_date_key } from '../sql-normalization'
import { datastore_path, row_to_activity, type ActivityDbRow, user_destinataire } from './rows'
import { type ListActivitiesOptions } from './schema'

const READ_SQL = `EXISTS (
  SELECT 1 FROM activites read_event
  WHERE read_event.type = 'activity.read'
    AND read_event.auteur = ?
    AND json_extract(read_event.contenu, '$.source_activity_id') = a.id
)`

export const list_activities = (
  actor: string,
  options: ListActivitiesOptions = {}
): ActiviteListItem[] => {
  const destinataire = actor.includes(':') ? actor : user_destinataire(actor)
  const db = new Database(datastore_path(), { readonly: true })
  try {
    const conditions: string[] = []
    const params: Array<string | number> = []
    if (options.contexts) {
      if (options.contexts.length === 0) conditions.push('0 = 1')
      else {
        conditions.push(`(${options.contexts.map(() => 'a.rattachement LIKE ?').join(' OR ')})`)
        params.push(...options.contexts.map((context) => `${context}:%`))
      }
    }
    if (options.rattachement) {
      conditions.push('a.rattachement = ?')
      params.push(options.rattachement)
    }
    if (options.inbox) {
      conditions.push(
        `EXISTS (
           SELECT 1 FROM json_each(a.mentions) AS mention
           WHERE json_extract(mention.value, '$.destinataire') = ?
         )`
      )
      params.push(destinataire)
      if (options.unread_only) {
        conditions.push(`NOT ${READ_SQL}`)
        params.push(destinataire)
      }
    }
    if (options.auteurs?.length) {
      conditions.push(`a.auteur IN (${options.auteurs.map(() => '?').join(', ')})`)
      params.push(...options.auteurs)
    }
    for (const field of ['id_client', 'id_locataire', 'id_lot', 'type'] as const) {
      const value = options[field]
      if (value) {
        conditions.push(`a.${field} = ?`)
        params.push(value)
      }
    }
    if (options.state) {
      conditions.push(`json_extract(a.contenu, '$.task.state') = ?`)
      params.push(options.state)
    }
    if (options.current_threads) {
      conditions.push(
        `a.thread_id IS NOT NULL
         AND a.type LIKE 'task.%'
         AND a.revision = (
           SELECT MAX(latest.revision)
           FROM activites latest
           WHERE latest.thread_id = a.thread_id AND latest.type LIKE 'task.%'
         )`
      )
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    params.push(options.limit ?? 100, options.offset ?? 0)
    const rows = db
      .query<ActivityDbRow, Array<string | number>>(
        `SELECT a.* FROM activites a ${where}
         ORDER BY ${sql_date_key('a.date_creation')} DESC, a.id DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params)
    const metaRows = db
      .query<ActivityDbRow, [string]>(
        `SELECT * FROM activites
         WHERE auteur = ? AND type IN ('activity.read', 'activity.reaction_changed')
         ORDER BY date_creation ASC, id ASC`
      )
      .all(destinataire)
    const reads = new Set<number>()
    const reactions = new Map<number, string | null>()
    for (const meta of metaRows) {
      const content = parse_activity_meta_content(meta.contenu)
      if (!content) continue
      if (meta.type === 'activity.read') reads.add(content.source_activity_id)
      else reactions.set(content.source_activity_id, content.emoji ?? null)
    }
    return rows.map((row) => {
      const activity = row_to_activity(row)
      return {
        ...activity,
        my: mention_of(activity.mentions, destinataire),
        read: reads.has(activity.id),
        reaction: reactions.get(activity.id) ?? null
      }
    })
  } finally {
    db.close()
  }
}
