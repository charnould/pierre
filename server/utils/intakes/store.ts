import { Database } from 'bun:sqlite'

import {
  type CreateIntakeBody,
  type IntakeConfig,
  type IntakeRecord,
  intakeStatusFromDates,
  intakeTableName,
  isIntakeInputField,
  type PatchIntakeBody,
  validateIntakeTableName
} from '../../../shared/intakes'
import {
  canManageCollaboratorResource,
  canonicalMentions,
  canSeeCollaboratorResource,
  type CollaboratorActor,
  normalizeCollaboratorPrincipal,
  parseMentionsJson
} from '../collaborator-access'
import { openDatastore } from '../datastore-db'
import { IntakesError } from './errors'
import {
  removeIntakeKnowledgeInDb,
  syncIntakeKnowledgeRowInDb,
  triggerIntakeKnowledgeRebuild
} from './knowledge'
import {
  diffPublishedIntakeFields,
  fieldsToColumnTypes,
  IntakeConfigSchema,
  parseColumnTypesJson,
  parseStoredIntakeConfig
} from './schemas'
import {
  addIntakeColumns,
  createIntakeTable,
  intakeTableExists,
  intakeTableStats,
  quoteSqlIdent
} from './table'

export type IntakeDbRow = {
  id: string
  name: string
  description: string
  table_name: string
  publish_to_knowledge: number
  owner: string
  mentions: string
  token: string | null
  config: string
  column_types: string
  created_at: string
  published_at: string | null
  closed_at: string | null
  last_notified_at: string | null
}

export type PublicIntake = Pick<
  IntakeRecord,
  'id' | 'name' | 'description' | 'tableName' | 'token' | 'config'
>

export function getIntakeRowById(db: Database, id: string): IntakeDbRow | null {
  return (
    db.query<IntakeDbRow, [string]>('SELECT * FROM intakes WHERE id = ? LIMIT 1').get(id) ?? null
  )
}

function rowToRecord(db: Database, row: IntakeDbRow): IntakeRecord {
  const config = parseStoredIntakeConfig(row.config)
  const published = row.published_at !== null
  const stats = published
    ? intakeTableStats(db, row.table_name)
    : { count: 0, lastSubmissionAt: null }
  const lockedColumns = published ? Object.keys(parseColumnTypesJson(row.column_types)) : []
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    tableName: row.table_name,
    publishToKnowledge: row.publish_to_knowledge === 1,
    owner: row.owner,
    mentions: parseMentionsJson(row.mentions),
    token: row.token,
    config,
    status: intakeStatusFromDates(row.published_at, row.closed_at),
    createdAt: row.created_at,
    publishedAt: row.published_at,
    closedAt: row.closed_at,
    lastNotifiedAt: row.last_notified_at,
    submissionCount: stats.count,
    lastSubmissionAt: stats.lastSubmissionAt,
    lockedColumns
  }
}

function requireManagedRow(db: Database, id: string, actor: CollaboratorActor): IntakeDbRow {
  const row = getIntakeRowById(db, id)
  if (!row) throw new IntakesError('Collecte introuvable', 'not_found')
  const mentions = parseMentionsJson(row.mentions)
  if (!canSeeCollaboratorResource(row.owner, mentions, actor)) {
    throw new IntakesError('Collecte introuvable', 'not_found')
  }
  if (!canManageCollaboratorResource(row.owner, actor)) {
    throw new IntakesError('Action réservée au créateur ou à un administrateur', 'forbidden')
  }
  return row
}

function withManagedIntake<T>(
  id: string,
  actor: CollaboratorActor,
  fn: (db: Database, existing: IntakeDbRow) => T
): T {
  using db = openDatastore()
  return db
    .transaction(() => {
      const existing = requireManagedRow(db, id, actor)
      return fn(db, existing)
    })
    .immediate()
}

function assertTableNameFreeInDb(db: Database, tableName: string, ignoreId?: string): void {
  const existing = db
    .query<{ id: string }, [string]>('SELECT id FROM intakes WHERE table_name = ? LIMIT 1')
    .get(tableName)
  if (existing && existing.id !== ignoreId) {
    throw new IntakesError(`Le nom de table « ${tableName} » est déjà utilisé`, 'conflict')
  }
}

export function list_intakes(actor: CollaboratorActor): IntakeRecord[] {
  using db = openDatastore({ readonly: true })
  return db
    .query<IntakeDbRow, []>('SELECT * FROM intakes ORDER BY created_at DESC')
    .all()
    .filter((row) => canSeeCollaboratorResource(row.owner, parseMentionsJson(row.mentions), actor))
    .map((row) => rowToRecord(db, row))
}

export function get_intake(id: string, actor: CollaboratorActor): IntakeRecord | null {
  using db = openDatastore({ readonly: true })
  const row = getIntakeRowById(db, id)
  if (!row || !canSeeCollaboratorResource(row.owner, parseMentionsJson(row.mentions), actor)) {
    return null
  }
  return rowToRecord(db, row)
}

/** Public lookup: returns only fields needed to render and validate an open public intake. */
export function get_active_intake_by_token(token: string): PublicIntake | null {
  const trimmed = token.trim()
  if (!trimmed) return null
  using db = openDatastore({ readonly: true })
  const row = db
    .query<
      Pick<IntakeDbRow, 'id' | 'name' | 'description' | 'table_name' | 'token' | 'config'>,
      [string]
    >(
      `SELECT id, name, description, table_name, token, config FROM intakes
       WHERE token = ? AND published_at IS NOT NULL AND closed_at IS NULL
       LIMIT 1`
    )
    .get(trimmed)
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    tableName: row.table_name,
    token: row.token,
    config: parseStoredIntakeConfig(row.config)
  }
}

/** Lightweight existence check for open public endpoints like speech transcription. */
export function has_active_intake_token(token: string): boolean {
  const trimmed = token.trim()
  if (!trimmed) return false
  using db = openDatastore({ readonly: true })
  return (
    db
      .query<{ ok: number }, [string]>(
        `SELECT 1 AS ok FROM intakes
         WHERE token = ? AND published_at IS NOT NULL AND closed_at IS NULL
         LIMIT 1`
      )
      .get(trimmed) !== null
  )
}

export function create_intake(owner: string, body: CreateIntakeBody): IntakeRecord {
  const tableName = validateIntakeTableName(body.tableName)
  if (!tableName) {
    throw new IntakesError('Nom de table invalide ou réservé', 'invalid')
  }
  const config = IntakeConfigSchema.parse(body.config)
  const canonicalOwner = normalizeCollaboratorPrincipal(owner)
  const id = Bun.randomUUIDv7()
  const createdAt = new Date().toISOString()

  using db = openDatastore()
  return db
    .transaction(() => {
      assertTableNameFreeInDb(db, tableName)
      const mentions = canonicalMentions(
        db,
        body.mentions ?? [],
        (message) => new IntakesError(message, 'invalid')
      )
      const inserted = db
        .query<
          IntakeDbRow,
          [string, string, string, string, number, string, string, string, string]
        >(
          `INSERT INTO intakes (
             id, name, description, table_name, publish_to_knowledge,
             owner, mentions, token, config, created_at,
             published_at, closed_at, last_notified_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, NULL, NULL)
           RETURNING *`
        )
        .get(
          id,
          body.name.trim(),
          (body.description ?? '').trim(),
          tableName,
          body.publishToKnowledge ? 1 : 0,
          canonicalOwner,
          JSON.stringify(mentions),
          JSON.stringify(config),
          createdAt
        )!
      return rowToRecord(db, inserted)
    })
    .immediate()
}

export function update_intake(
  id: string,
  actor: CollaboratorActor,
  patch: PatchIntakeBody
): IntakeRecord {
  const { record, rebuild } = withManagedIntake(id, actor, (db, existing) => {
    const isPublished = existing.published_at !== null
    const prevConfig = parseStoredIntakeConfig(existing.config)
    const existingColumnTypes = parseColumnTypesJson(existing.column_types)

    let tableName = existing.table_name
    if (patch.tableName !== undefined) {
      const normalized = validateIntakeTableName(patch.tableName)
      if (!normalized) throw new IntakesError('Nom de table invalide ou réservé', 'invalid')
      if (isPublished && normalized !== existing.table_name) {
        throw new IntakesError(
          'Le nom de la table SQLite ne peut plus être modifié après publication',
          'conflict'
        )
      }
      if (normalized !== existing.table_name) {
        assertTableNameFreeInDb(db, normalized, id)
        tableName = normalized
      }
    }

    const nextConfig: IntakeConfig =
      patch.config !== undefined ? IntakeConfigSchema.parse(patch.config) : prevConfig

    let addedFields: IntakeConfig['form']['fields'] = []
    if (isPublished && patch.config !== undefined) {
      if (!nextConfig.form.fields.some(isIntakeInputField)) {
        throw new IntakesError(
          'Une collecte publiée doit conserver au moins un champ saisissable',
          'invalid'
        )
      }
      const existingCols = new Set(Object.keys(existingColumnTypes))
      const diff = diffPublishedIntakeFields(prevConfig, nextConfig, existingCols)
      if ('error' in diff) throw new IntakesError(diff.error, 'conflict')
      addedFields = diff.addedFields
    }

    const nextPublishToKnowledge =
      patch.publishToKnowledge !== undefined
        ? patch.publishToKnowledge
        : existing.publish_to_knowledge === 1

    const nextMentions =
      patch.mentions !== undefined
        ? canonicalMentions(db, patch.mentions, (message) => new IntakesError(message, 'invalid'))
        : parseMentionsJson(existing.mentions)

    const prevMode = prevConfig.notifications.mode
    const nextMode = nextConfig.notifications.mode
    const enteringDigest =
      (nextMode === 'hourly' || nextMode === 'daily') &&
      prevMode !== 'hourly' &&
      prevMode !== 'daily'
    const nextLastNotifiedAt = enteringDigest ? new Date().toISOString() : existing.last_notified_at

    let nextColumnTypes = existingColumnTypes
    if (isPublished && addedFields.length > 0) {
      addIntakeColumns(db, tableName, addedFields)
      nextColumnTypes = { ...existingColumnTypes, ...fieldsToColumnTypes(addedFields) }
    }

    const nextName = patch.name !== undefined ? patch.name.trim() : existing.name
    const nextDescription =
      patch.description !== undefined ? patch.description.trim() : existing.description

    const updated = db
      .query<
        IntakeDbRow,
        [string, string, string, number, string, string, string, string | null, string]
      >(
        `UPDATE intakes
         SET name = ?, description = ?, table_name = ?, publish_to_knowledge = ?,
             mentions = ?, config = ?, column_types = ?, last_notified_at = ?
         WHERE id = ?
         RETURNING *`
      )
      .get(
        nextName,
        nextDescription,
        tableName,
        nextPublishToKnowledge ? 1 : 0,
        JSON.stringify(nextMentions),
        JSON.stringify(nextConfig),
        JSON.stringify(nextColumnTypes),
        nextLastNotifiedAt,
        id
      )!

    return {
      record: rowToRecord(db, updated),
      rebuild: isPublished ? syncIntakeKnowledgeRowInDb(db, updated) : ('none' as const)
    }
  })

  triggerIntakeKnowledgeRebuild(rebuild, actor.email)
  return record
}

export function publish_intake(id: string, actor: CollaboratorActor): IntakeRecord {
  return withManagedIntake(id, actor, (db, existing) => {
    if (existing.published_at !== null) {
      throw new IntakesError('Cette collecte est déjà publiée', 'conflict')
    }
    const config = parseStoredIntakeConfig(existing.config)
    const columnTypes = fieldsToColumnTypes(config.form.fields)
    if (Object.keys(columnTypes).length === 0) {
      throw new IntakesError('Ajoutez au moins un champ saisissable avant de publier', 'invalid')
    }
    if (intakeTableExists(db, existing.table_name)) {
      throw new IntakesError(
        `La table SQLite « intake_${existing.table_name} » existe déjà`,
        'conflict'
      )
    }

    createIntakeTable(db, existing.table_name, config.form.fields)
    const token = crypto.randomUUID()
    const now = new Date().toISOString()

    const published = db
      .query<IntakeDbRow, [string, string, string, string, string]>(
        `UPDATE intakes
         SET token = ?, published_at = ?, last_notified_at = ?, column_types = ?
         WHERE id = ?
         RETURNING *`
      )
      .get(token, now, now, JSON.stringify(columnTypes), id)!

    if (published.publish_to_knowledge === 1) {
      syncIntakeKnowledgeRowInDb(db, published)
    }

    return rowToRecord(db, published)
  })
}

export function revoke_intake(id: string, actor: CollaboratorActor): IntakeRecord {
  return withManagedIntake(id, actor, (db, existing) => {
    if (existing.published_at === null) {
      throw new IntakesError('Impossible de révoquer une collecte en brouillon', 'conflict')
    }
    const updated = db
      .query<IntakeDbRow, [string, string]>('UPDATE intakes SET token = ? WHERE id = ? RETURNING *')
      .get(crypto.randomUUID(), id)!
    return rowToRecord(db, updated)
  })
}

export function close_intake(id: string, actor: CollaboratorActor): IntakeRecord {
  return withManagedIntake(id, actor, (db, existing) => {
    if (existing.published_at === null) {
      throw new IntakesError('Impossible de clôturer une collecte en brouillon', 'conflict')
    }
    if (existing.closed_at !== null) {
      throw new IntakesError('Cette collecte est déjà clôturée', 'conflict')
    }
    const updated = db
      .query<IntakeDbRow, [string, string]>(
        'UPDATE intakes SET closed_at = ? WHERE id = ? RETURNING *'
      )
      .get(new Date().toISOString(), id)!
    return rowToRecord(db, updated)
  })
}

export function reopen_intake(id: string, actor: CollaboratorActor): IntakeRecord {
  return withManagedIntake(id, actor, (db, existing) => {
    if (existing.published_at === null || existing.closed_at === null) {
      throw new IntakesError('Cette collecte n’est pas clôturée', 'conflict')
    }
    const updated = db
      .query<IntakeDbRow, [string]>('UPDATE intakes SET closed_at = NULL WHERE id = ? RETURNING *')
      .get(id)!
    return rowToRecord(db, updated)
  })
}

export function purge_intake(id: string, actor: CollaboratorActor): IntakeRecord {
  const { record, rebuild } = withManagedIntake(id, actor, (db, existing) => {
    if (existing.published_at === null) {
      throw new IntakesError('Impossible de purger une collecte en brouillon', 'conflict')
    }
    db.run(`DELETE FROM ${quoteSqlIdent(intakeTableName(existing.table_name))}`)
    const updated = db
      .query<IntakeDbRow, [string, string]>(
        'UPDATE intakes SET last_notified_at = ? WHERE id = ? RETURNING *'
      )
      .get(new Date().toISOString(), id)!
    return {
      record: rowToRecord(db, updated),
      rebuild:
        updated.publish_to_knowledge === 1
          ? syncIntakeKnowledgeRowInDb(db, updated)
          : ('none' as const)
    }
  })

  triggerIntakeKnowledgeRebuild(rebuild, actor.email)
  return record
}

export function delete_intake(id: string, actor: CollaboratorActor): void {
  const rebuild = withManagedIntake(id, actor, (db, existing) => {
    db.run(`DROP TABLE IF EXISTS ${quoteSqlIdent(intakeTableName(existing.table_name))}`)
    db.run('DELETE FROM intakes WHERE id = ?', [id])
    return removeIntakeKnowledgeInDb(db, existing.table_name)
  })

  triggerIntakeKnowledgeRebuild(rebuild, actor.email)
}
