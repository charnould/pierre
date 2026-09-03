import { Database } from 'bun:sqlite'

import { type ActiviteListItem, mention_of } from '../../../shared/activites'
import { sql_date_key } from '../sql-normalization'
import { datastore_path, row_to_activity, type ActivityDbRow, user_destinataire } from './rows'
import { type ListActivitiesOptions } from './schema'

export const list_activities = (
  actor: string,
  options: ListActivitiesOptions = {}
): ActiviteListItem[] => {
  const destinataire = actor.includes(':') ? actor : user_destinataire(actor)
  const db = new Database(datastore_path(), { readonly: true })
  try {
    const conditions: string[] = []
    const params: Array<string | number> = []
    if (options.rattachement) {
      conditions.push('a.rattachement = ?')
      params.push(options.rattachement)
    }
    if (options.inbox) {
      conditions.push(
        `EXISTS (
           SELECT 1 FROM json_each(a.mentions) AS mention
           WHERE json_extract(mention.value, '$.destinataire') = ?
             AND json_extract(mention.value, '$.inbox') IS NOT 0
         )`
      )
      params.push(destinataire)
      if (options.unread_only) {
        conditions.push(
          `EXISTS (
             SELECT 1 FROM json_each(a.mentions) AS mention
             WHERE json_extract(mention.value, '$.destinataire') = ?
               AND json_extract(mention.value, '$.inbox') IS NOT 0
               AND json_extract(mention.value, '$.lu') = 0
           )`
        )
        params.push(destinataire)
      }
    }
    if (options.auteurs?.length) {
      conditions.push(`a.auteur IN (${options.auteurs.map(() => '?').join(', ')})`)
      params.push(...options.auteurs)
    }
    for (const field of ['id_client', 'id_locataire', 'id_lot', 'type', 'statut'] as const) {
      const value = options[field]
      if (value) {
        conditions.push(`a.${field} = ?`)
        params.push(value)
      }
    }
    if (options.state) {
      conditions.push('a.state = ?')
      params.push(options.state)
    }
    if (options.current_threads) {
      conditions.push(
        `a.thread_id IS NOT NULL
         AND a.revision = (
           SELECT MAX(latest.revision)
           FROM activites latest
           WHERE latest.type = 'action' AND latest.thread_id = a.thread_id
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
    return rows.map((row) => {
      const activity = row_to_activity(row)
      return { ...activity, my: mention_of(activity.mentions, destinataire) }
    })
  } finally {
    db.close()
  }
}
