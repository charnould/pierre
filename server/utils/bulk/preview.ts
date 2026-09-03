import { Database } from 'bun:sqlite'

import type {
  BulkOperationDefinition,
  PreviewMessageResult,
  PreviewQueryResult,
  PreviewRow
} from '../../../shared/bulk-operations'
import { latest_repayment_states, repayment_action_history } from '../activities/repayment'
import { datastorePaths } from '../paths'
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
import { BulkQueryError, compile_and_run } from './query'
import { contact_issues, select_fallback_route } from './route-policy'

const datastore_path = (): string => datastorePaths().database

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

export const preview_query = (input: {
  definition: BulkOperationDefinition
  bulkOperationId?: string
  confirmedAt?: Date
}): PreviewQueryResult => {
  const db = new Database(datastore_path(), { readonly: true })
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
  }
): PreviewQueryResult => {
  const compiled = compile_and_run(db, input.definition)
  const ids = compiled.rows.map((row) => String(row['id_locataire']))
  const states = latest_repayment_states(db, ids)
  const actions = repayment_action_history(db, ids)
  const audienceRows = compiled.rows.filter((sqlRow) => {
    const id = String(sqlRow['id_locataire'])
    const bucket = states.get(id)?.bucket ?? 'non_traites'
    const actionHistory = actions.get(id) ?? new Set<string>()
    return (
      (input.definition.requiredBuckets.length === 0 ||
        input.definition.requiredBuckets.includes(bucket)) &&
      input.definition.requiredActions.every((action) => actionHistory.has(action))
    )
  })
  const rows: PreviewRow[] = audienceRows.map((sqlRow) => {
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
    if (input.definition.delivery.kind === 'rich_rcs') {
      const reasons = contact_issues('rcs', row)
      try {
        const placeholders = new Set<string>()
        for (const node of input.definition.delivery.nodes) {
          collect_placeholders([node.body, node.richContent], placeholders)
        }
        validate_bindings(
          placeholders,
          input.definition.delivery.placeholderBindings,
          new Set(Object.keys(row.values))
        )
      } catch {
        reasons.push({
          code: 'missing_placeholders',
          placeholders: [...collect_placeholders(input.definition.delivery.nodes)].sort()
        })
      }
      if (reasons.length === 0) row.route = { kind: 'rich_rcs', medium: 'rcs' }
      else row.status = 'no_usable_route'
      return row
    }
    const selection = select_fallback_route(row, input.definition.delivery.steps)
    row.route = selection.route
    row.skippedSteps = selection.skippedSteps
    if (!row.route) row.status = 'no_usable_route'
    return row
  })
  return {
    sql: compiled.sql,
    rows,
    totals: {
      total: rows.length,
      eligible: rows.filter((row) => row.status === 'eligible').length,
      no_usable_route: rows.filter((row) => row.status === 'no_usable_route').length
    }
  }
}

const pdf_filename = (filename: string): string =>
  `Aperçu - ${filename.replace(/\.docx$/i, '')}.pdf`

export const preview_message = async (input: {
  definition: BulkOperationDefinition
  id_locataire: string
  bulkOperationId?: string
  nodeId?: string
}): Promise<PreviewMessageResult> => {
  const now = new Date()
  const preview = preview_query({ ...input, confirmedAt: now })
  const row = preview.rows.find((item) => item.id_locataire === input.id_locataire)
  if (!row) throw new BulkQueryError(`Locataire absent du résultat : ${input.id_locataire}`)
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
        pdfBase64: Buffer.from(pdf).toString('base64'),
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
