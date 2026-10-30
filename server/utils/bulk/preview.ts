import { Database } from 'bun:sqlite'

import type {
  BulkMedium,
  BulkOperationDefinition,
  PreviewMessageResult,
  PreviewQueryResult,
  PreviewRow
} from '../../../shared/bulk-operations'
import { latest_repayment_states, repayment_action_history } from '../activities/repayment'
import { openDatastore } from '../datastore-db'
import { render_docx_pdf } from './docx'
import {
  BulkPlaceholderError,
  collect_placeholders,
  render_content,
  resolve_binding_values,
  step_placeholders,
  stringify_placeholder_value,
  validate_bindings
} from './placeholders'
import { BulkQueryError, compile_for_db } from './query'
import { contact_issues, select_fallback_route } from './route-policy'

const BULK_PREVIEW_LIMIT = 100
const AUDIENCE_CHUNK = 200

const text_from_row = (row: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    if (!(key in row)) continue
    const text = stringify_placeholder_value(row[key])
    if (text) return text
  }
  return null
}

const statut_from_row = (row: Record<string, unknown>, key: string): string | null => {
  const value = row[key]
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

const in_audience = (
  id: string,
  states: ReturnType<typeof latest_repayment_states>,
  actions: Map<string, Set<string>>,
  definition: BulkOperationDefinition
): boolean => {
  const bucket = states.get(id)?.bucket ?? 'non_traites'
  const history = actions.get(id) ?? new Set<string>()
  return (
    (definition.requiredBuckets.length === 0 || definition.requiredBuckets.includes(bucket)) &&
    definition.requiredActions.every((action) => history.has(action))
  )
}

const preview_row = (
  sqlRow: Record<string, unknown>,
  states: ReturnType<typeof latest_repayment_states>,
  definition: BulkOperationDefinition
): PreviewRow => {
  const idLocataire = String(sqlRow['id_locataire'])
  const state = states.get(idLocataire)
  const row: PreviewRow = {
    id_locataire: idLocataire,
    id_client: text_from_row(sqlRow, ['id_client']),
    nom: text_from_row(sqlRow, ['nom_locataire', 'nom']),
    email: text_from_row(sqlRow, ['email_client', 'email_locataire', 'email']),
    telephone: text_from_row(sqlRow, ['telephone_client', 'telephone_locataire', 'telephone']),
    adresse: text_from_row(sqlRow, ['adresse']),
    gestionnaire: state?.gestionnaire ?? null,
    gestionnaire_email: state?.gestionnaire_email ?? null,
    values: {
      ...sqlRow,
      email_status: statut_from_row(sqlRow, 'email_status'),
      telephone_status: statut_from_row(sqlRow, 'telephone_status')
    },
    status: 'eligible',
    route: null,
    skippedSteps: []
  }
  if (definition.delivery.kind === 'rich_rcs') {
    const reasons = contact_issues('rcs', row)
    try {
      const placeholders = new Set<string>()
      for (const node of definition.delivery.nodes) {
        collect_placeholders([node.body, node.richContent], placeholders)
      }
      validate_bindings(
        placeholders,
        definition.delivery.placeholderBindings,
        new Set(Object.keys(row.values))
      )
    } catch {
      reasons.push({
        code: 'missing_placeholders',
        placeholders: [...collect_placeholders(definition.delivery.nodes)].sort()
      })
    }
    if (reasons.length === 0) row.route = { kind: 'rich_rcs', medium: 'rcs' }
    else row.status = 'no_usable_route'
    return row
  }
  const selection = select_fallback_route(row, definition.delivery.steps)
  row.route = selection.route
  row.skippedSteps = selection.skippedSteps
  if (!row.route) row.status = 'no_usable_route'
  return row
}

const walk_audience = (
  db: Database,
  definition: BulkOperationDefinition,
  options: {
    offset?: number
    limit?: number
    onRow?: (row: PreviewRow) => void
    idLocataire?: string
  } = {}
): PreviewQueryResult => {
  const compiled = compile_for_db(db, definition)
  const sql = options.idLocataire
    ? `SELECT * FROM (${compiled.sql}) matched WHERE id_locataire = ?`
    : compiled.sql
  const params = options.idLocataire ? [...compiled.params, options.idLocataire] : compiled.params
  const seen = new Set<string>()
  const rows: PreviewRow[] = []
  const channels: Partial<Record<BulkMedium, number>> = {}
  const totals = { total: 0, eligible: 0, noUsableRoute: 0, channels }
  const offset = options.offset ?? 0
  const limit = options.limit ?? BULK_PREVIEW_LIMIT
  let index = 0
  let batch: Record<string, unknown>[] = []

  const flush = () => {
    if (batch.length === 0) return
    const ids = batch.map((row) => String(row['id_locataire']))
    const states = latest_repayment_states(db, ids)
    const actions =
      definition.requiredActions.length > 0
        ? repayment_action_history(db, ids)
        : new Map<string, Set<string>>()
    for (const sqlRow of batch) {
      const id = String(sqlRow['id_locataire'])
      if (!in_audience(id, states, actions, definition)) continue
      const row = preview_row(sqlRow, states, definition)
      totals.total += 1
      if (row.status === 'eligible') totals.eligible += 1
      else totals.noUsableRoute += 1
      if (row.route) channels[row.route.medium] = (channels[row.route.medium] ?? 0) + 1
      options.onRow?.(row)
      if (index >= offset && rows.length < limit) rows.push(row)
      index += 1
    }
    batch = []
  }

  for (const sqlRow of db
    .query<Record<string, unknown>, Array<string | number>>(sql)
    .iterate(...params)) {
    const id = sqlRow['id_locataire']
    if (typeof id !== 'string' || id.trim() === '') {
      throw new BulkQueryError('Chaque ligne doit porter un id_locataire')
    }
    if (seen.has(id))
      throw new BulkQueryError('La requête doit retourner un id_locataire unique par ligne')
    seen.add(id)
    batch.push(sqlRow)
    if (batch.length === AUDIENCE_CHUNK) flush()
  }
  flush()
  return { sql: compiled.sql, rows, totals, limit, offset }
}

export const preview_query = (input: {
  definition: BulkOperationDefinition
  bulkOperationId?: string
  confirmedAt?: Date
  offset?: number
}): PreviewQueryResult => {
  const db = openDatastore({ readonly: true })
  try {
    return preview_query_with_db(db, input)
  } finally {
    db.close()
  }
}

export const preview_query_with_db = (
  db: Database,
  input: {
    definition: BulkOperationDefinition
    bulkOperationId?: string
    confirmedAt?: Date
    offset?: number
    limit?: number
    onRow?: (row: PreviewRow) => void
  }
): PreviewQueryResult =>
  walk_audience(db, input.definition, {
    offset: input.onRow ? 0 : input.offset,
    limit: input.onRow ? 0 : input.limit,
    onRow: input.onRow
  })

const pdf_filename = (filename: string): string =>
  `Aperçu - ${filename.replace(/\.docx$/i, '')}.pdf`

export const preview_message = async (input: {
  definition: BulkOperationDefinition
  id_locataire: string
  bulkOperationId?: string
  nodeId?: string
}): Promise<PreviewMessageResult> => {
  const now = new Date()
  const db = openDatastore({ readonly: true })
  let row: PreviewRow
  try {
    const found = walk_audience(db, input.definition, {
      idLocataire: input.id_locataire,
      limit: 1
    }).rows[0]
    if (!found) throw new BulkQueryError(`Locataire absent du résultat : ${input.id_locataire}`)
    row = found
  } finally {
    db.close()
  }
  if (!row.route) throw new BulkQueryError('Aucune route exploitable pour ce locataire')
  try {
    if (input.definition.delivery.kind === 'rich_rcs') {
      const node = input.nodeId
        ? input.definition.delivery.nodes.find((candidate) => candidate.id === input.nodeId)
        : input.definition.delivery.nodes[0]
      if (!node) throw new BulkQueryError('Nœud RCS introuvable')
      const bindings = input.definition.delivery.placeholderBindings
      const rendered = render_content(
        { body: node.body, richContent: node.richContent },
        bindings,
        row.values,
        now
      ) as { body: string; richContent: Record<string, unknown> }
      const keys = collect_placeholders([node.body, node.richContent])
      const values = resolve_binding_values(bindings, row.values, now)
      return {
        kind: 'rich_rcs',
        medium: 'rcs',
        nodeId: node.id,
        body: rendered.body,
        richContent: rendered.richContent,
        placeholders: Object.fromEntries([...keys].map((key) => [key, values[key] ?? '']))
      }
    }
    if (row.route.kind !== 'fallback') throw new BulkQueryError('Route incohérente')
    const step = input.definition.delivery.steps[row.route.stepIndex]
    if (!step) throw new BulkQueryError('Cran de fallback introuvable')
    if ('fileBase64' in step) {
      validate_bindings(
        step.placeholders,
        step.placeholderBindings,
        new Set(Object.keys(row.values))
      )
      const values = resolve_binding_values(step.placeholderBindings, row.values, now)
      const pdf = await render_docx_pdf(step.fileBase64, values)
      return {
        kind: 'pdf',
        medium: step.medium,
        filename: pdf_filename(step.filename),
        pdfBase64: pdf.toBase64(),
        mimeType: 'application/pdf'
      }
    }
    const content =
      'subject' in step ? { subject: step.subject, body: step.body } : { body: step.body }
    const rendered = render_content(content, step.placeholderBindings, row.values, now) as {
      subject?: string
      body: string
    }
    const values = resolve_binding_values(step.placeholderBindings, row.values, now)
    return {
      kind: 'text',
      medium: step.medium,
      rendered: rendered.body,
      ...(rendered.subject === undefined ? {} : { subject: rendered.subject }),
      placeholders: Object.fromEntries(
        [...step_placeholders(step)].map((key) => [key, values[key] ?? ''])
      )
    }
  } catch (error) {
    if (error instanceof BulkQueryError) throw error
    if (error instanceof BulkPlaceholderError) throw new BulkQueryError(error.message)
    throw error
  }
}
