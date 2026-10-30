import { type ActivityListItem, mentionOf } from '../../../shared/activities'
import { parseActivityMetaContent } from '../../../shared/activity-content'
import { openDatastore } from '../datastore-db'
import { sql_date_key } from '../sql-normalization'
import { type ActivityDbRow, row_to_activity, user_destinataire } from './rows'
import { type ListActivitiesOptions } from './schema'

export const list_activities = (
  actor: string,
  options: ListActivitiesOptions = {}
): ActivityListItem[] => {
  const destinataire = actor.includes(':') ? actor : user_destinataire(actor)
  const db = openDatastore({ readonly: true })
  try {
    const conditions: string[] = []
    const params: Array<string | number> = []
    const ctes: string[] = []
    let from = 'activites a'
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
      if (options.unreadOnly) {
        ctes.push(`latest_read AS (
          SELECT source_id, type FROM (
            SELECT json_extract(contenu, '$.source_activity_id') AS source_id,
                   type,
                   ROW_NUMBER() OVER (
                     PARTITION BY json_extract(contenu, '$.source_activity_id')
                     ORDER BY date_creation DESC, id DESC
                   ) AS rn
            FROM activites
            WHERE auteur = ?
              AND type IN ('activity.read', 'activity.unread')
          )
          WHERE rn = 1
        )`)
        params.unshift(destinataire)
        from += ' LEFT JOIN latest_read read_state ON read_state.source_id = a.id'
        conditions.push(`IFNULL(read_state.type, '') <> 'activity.read'`)
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
    if (options.currentThreads) {
      ctes.push(`latest_task AS (
        SELECT thread_id, MAX(revision) AS revision
        FROM activites
        WHERE thread_id IS NOT NULL AND type LIKE 'task.%'
        GROUP BY thread_id
      )`)
      from +=
        ' JOIN latest_task ON latest_task.thread_id = a.thread_id AND latest_task.revision = a.revision'
      conditions.push(`a.thread_id IS NOT NULL AND a.type LIKE 'task.%'`)
    }
    if (options.assignee === 'me') {
      conditions.push(`lower(json_extract(a.contenu, '$.task.assignee.id')) = lower(?)`)
      params.push(destinataire)
    } else if (options.assignee === 'other') {
      conditions.push(
        `json_extract(a.contenu, '$.task.assignee.id') IS NOT NULL
         AND json_extract(a.contenu, '$.task.assignee.id') != ''
         AND lower(json_extract(a.contenu, '$.task.assignee.id')) != lower(?)`
      )
      params.push(destinataire)
    }
    if (options.createdBy === 'me') {
      conditions.push(
        `EXISTS (
           SELECT 1 FROM activites created
           WHERE created.thread_id = a.thread_id
             AND created.type = 'task.created'
             AND lower(created.auteur) = lower(?)
         )`
      )
      params.push(destinataire)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const order =
      options.order === 'due_asc'
        ? `CASE
             WHEN json_extract(a.contenu, '$.task.due_date') IS NULL
               OR json_extract(a.contenu, '$.task.due_date') = ''
             THEN 1 ELSE 0
           END,
           json_extract(a.contenu, '$.task.due_date') ASC,
           ${sql_date_key('a.date_creation')} ASC, a.id ASC`
        : `${sql_date_key('a.date_creation')} DESC, a.id DESC`
    const limitSql = options.all ? '' : 'LIMIT ? OFFSET ?'
    if (!options.all) params.push(options.limit ?? 100, options.offset ?? 0)
    const withSql = ctes.length > 0 ? `WITH ${ctes.join(',\n')}` : ''
    const rows = db
      .query<ActivityDbRow, Array<string | number>>(
        `${withSql} SELECT a.* FROM ${from} ${where}
         ORDER BY ${order}
         ${limitSql}`
      )
      .all(...params)
    const pageIds = rows.map((row) => row.id)
    const metaRows =
      pageIds.length === 0
        ? []
        : db
            .query<ActivityDbRow, Array<string | number>>(
              `SELECT * FROM activites
               WHERE auteur = ?
                 AND type IN ('activity.read', 'activity.unread', 'activity.reaction_changed')
                 AND json_extract(contenu, '$.source_activity_id') IN (${pageIds.map(() => '?').join(', ')})
               ORDER BY date_creation ASC, id ASC`
            )
            .all(destinataire, ...pageIds)
    const reads = new Set<number>()
    const reactions = new Map<number, string | null>()
    for (const meta of metaRows) {
      const content = parseActivityMetaContent(meta.contenu)
      if (!content) continue
      if (meta.type === 'activity.read') reads.add(content.source_activity_id)
      else if (meta.type === 'activity.unread') reads.delete(content.source_activity_id)
      else reactions.set(content.source_activity_id, content.emoji ?? null)
    }
    return rows.map((row) => {
      const activity = row_to_activity(row)
      return {
        ...activity,
        my: mentionOf(activity.mentions, destinataire),
        read: reads.has(activity.id),
        reaction: reactions.get(activity.id) ?? null
      }
    })
  } finally {
    db.close()
  }
}
