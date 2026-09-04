import { Database } from 'bun:sqlite'

import { z } from 'zod'

import repaymentConfig from '../../../customization/repayments/config'
import {
  BULK_SOURCES,
  type BulkOperationDefinition,
  type BulkOperationQueryDefinition
} from '../../../shared/bulk-operations'
import { rich_rcs_graph_issues } from '../../../shared/bulk-rich-rcs'
import {
  COMPTES_LOCATAIRES_TABLE,
  CONTACTS_TABLE,
  LOTS_TABLE,
  type LedgerColumnMeta
} from '../ledger/schema'
import { build_ledger_view_sql } from '../ledger/view'

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/

export class BulkQueryError extends Error {
  constructor(
    message: string,
    readonly code: 'invalid_query' | 'not_implemented' = 'invalid_query'
  ) {
    super(message)
    this.name = 'BulkQueryError'
  }
}

const AmountRangeSchema = z
  .object({
    from: z.string().optional(),
    to: z.string().optional()
  })
  .strict()

const configuredTags = new Set<string>(repaymentConfig.tags)
const configuredBuckets = new Set<string>(repaymentConfig.buckets.map((bucket) => bucket.id))
const configuredActions = new Set<string>([
  ...repaymentConfig.actions.dossier,
  ...repaymentConfig.actions.bulk_operations
])

const QueryAudienceSchema = {
  source: z.enum(BULK_SOURCES),
  requiredBuckets: z.array(z.string().trim().min(1)),
  requiredActions: z.array(z.string().trim().min(1)),
  requiredTags: z.array(z.string().trim().min(1)),
  excludedTags: z.array(z.string().trim().min(1)),
  amountRange: AmountRangeSchema.optional(),
  unpaidMonthsRange: AmountRangeSchema.optional()
}

const PlaceholderBindingsSchema = z.record(
  z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
  z.string().trim().min(1)
)

const TextStepSchema = z
  .object({
    medium: z.enum(['rcs', 'sms']),
    action: z.string().trim().min(1),
    body: z.string(),
    placeholderBindings: PlaceholderBindingsSchema
  })
  .strict()

const SubjectStepSchema = z
  .object({
    medium: z.enum(['email', 'lre']),
    action: z.string().trim().min(1),
    subject: z.string(),
    body: z.string(),
    placeholderBindings: PlaceholderBindingsSchema
  })
  .strict()

const DocxStepSchema = z
  .object({
    medium: z.enum(['courrier', 'lrar']),
    action: z.string().trim().min(1),
    filename: z.string(),
    fileBase64: z.string(),
    placeholders: z.array(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/)),
    placeholderBindings: PlaceholderBindingsSchema,
    summary: z.string().trim().max(500)
  })
  .strict()
  .superRefine((step, ctx) => {
    if (new Set(step.placeholders).size !== step.placeholders.length) {
      ctx.addIssue({ code: 'custom', path: ['placeholders'], message: 'Placeholders dupliqués' })
    }
    if ([...step.placeholders].sort().some((value, index) => value !== step.placeholders[index])) {
      ctx.addIssue({ code: 'custom', path: ['placeholders'], message: 'Placeholders non triés' })
    }
    const filename = step.filename.trim()
    const fileBase64 = step.fileBase64.trim()
    if (!filename && !fileBase64) return
    if (!filename || !/\.docx$/i.test(filename)) {
      ctx.addIssue({ code: 'custom', path: ['filename'], message: 'Nom de fichier Word invalide' })
    }
    if (!fileBase64) {
      ctx.addIssue({ code: 'custom', path: ['fileBase64'], message: 'Fichier Word manquant' })
      return
    }
    let bytes: Uint8Array
    try {
      bytes = Uint8Array.fromBase64(fileBase64)
    } catch {
      bytes = new Uint8Array()
    }
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(fileBase64) || bytes.toBase64() !== fileBase64) {
      ctx.addIssue({ code: 'custom', path: ['fileBase64'], message: 'Base64 invalide' })
    } else {
      if (bytes.byteLength > 1_000_000) {
        ctx.addIssue({ code: 'custom', path: ['fileBase64'], message: 'DOCX trop volumineux' })
      }
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
        ctx.addIssue({ code: 'custom', path: ['fileBase64'], message: 'Signature DOCX invalide' })
      }
    }
  })

const SimpleDeliveryStepSchema = z.discriminatedUnion('medium', [
  TextStepSchema,
  SubjectStepSchema,
  DocxStepSchema
])

const RichRcsNodeSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9_]*$/),
    body: z.string().trim().min(1),
    richContent: z.record(z.string(), z.unknown()),
    transitions: z.record(
      z.string(),
      z
        .string()
        .regex(/^[a-z][a-z0-9_]*$/)
        .nullable()
    )
  })
  .strict()

const DeliverySchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('fallback'),
      steps: z.array(SimpleDeliveryStepSchema).min(1).max(6)
    })
    .strict()
    .superRefine((delivery, ctx) => {
      const media = delivery.steps.map((step) => step.medium)
      if (new Set(media).size !== media.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['steps'],
          message: 'Delivery media must be unique'
        })
      }
    }),
  z
    .object({
      kind: z.literal('rich_rcs'),
      action: z.string().trim().min(1),
      nodes: z.array(RichRcsNodeSchema).min(1),
      placeholderBindings: PlaceholderBindingsSchema,
      replyTimeoutHours: z.number().int().min(1).max(720).default(72)
    })
    .strict()
    .superRefine((delivery, ctx) => {
      for (const message of rich_rcs_graph_issues(delivery.nodes)) {
        ctx.addIssue({ code: 'custom', path: ['nodes'], message })
      }
    })
])

const parsed_bound = (raw: string | undefined): number | null => {
  if (raw == null || raw.trim() === '') return null
  const value = Number(raw.trim().replace(',', '.'))
  return Number.isFinite(value) ? value : Number.NaN
}

const validate_audience = (
  definition: z.infer<z.ZodObject<typeof QueryAudienceSchema>>,
  ctx: z.RefinementCtx
): void => {
  for (const key of [
    'requiredBuckets',
    'requiredActions',
    'requiredTags',
    'excludedTags'
  ] as const) {
    const seen = new Set<string>()
    definition[key].forEach((tag, index) => {
      const catalog =
        key === 'requiredBuckets'
          ? configuredBuckets
          : key === 'requiredActions'
            ? configuredActions
            : configuredTags
      const label =
        key === 'requiredBuckets' ? 'Panier' : key === 'requiredActions' ? 'Action' : 'Tag'
      if (!catalog.has(tag)) {
        ctx.addIssue({
          code: 'custom',
          path: [key, index],
          message: `${label} inconnu${label === 'Action' ? 'e' : ''} : ${tag}`
        })
      }
      if (seen.has(tag)) {
        ctx.addIssue({
          code: 'custom',
          path: [key, index],
          message: `${label} dupliqué${label === 'Action' ? 'e' : ''} : ${tag}`
        })
      }
      seen.add(tag)
    })
  }
  definition.requiredTags.forEach((tag, index) => {
    if (definition.excludedTags.includes(tag)) {
      ctx.addIssue({
        code: 'custom',
        path: ['requiredTags', index],
        message: `Tag à la fois requis et exclu : ${tag}`
      })
    }
  })
  for (const key of ['amountRange', 'unpaidMonthsRange'] as const) {
    const range = definition[key]
    if (!range) continue
    const from = parsed_bound(range.from)
    const to = parsed_bound(range.to)
    if (Number.isNaN(from)) {
      ctx.addIssue({ code: 'custom', path: [key, 'from'], message: 'Borne non finie' })
    }
    if (Number.isNaN(to)) {
      ctx.addIssue({ code: 'custom', path: [key, 'to'], message: 'Borne non finie' })
    }
    if (from != null && to != null && !Number.isNaN(from) && !Number.isNaN(to) && from > to) {
      ctx.addIssue({
        code: 'custom',
        path: [key],
        message: 'La borne minimale doit être inférieure ou égale à la borne maximale'
      })
    }
  }
}

export const BulkOperationQueryDefinitionSchema = z
  .object(QueryAudienceSchema)
  .strict()
  .superRefine(validate_audience)

export const BulkOperationDefinitionSchema = z
  .object({
    ...QueryAudienceSchema,
    bucketId: z.string().trim().min(1),
    delivery: DeliverySchema,
    notifyManager: z.boolean()
  })
  .strict()
  .superRefine((definition, ctx) => {
    validate_audience(definition, ctx)
    if (!configuredBuckets.has(definition.bucketId)) {
      ctx.addIssue({
        code: 'custom',
        path: ['bucketId'],
        message: `Panier inconnu : ${definition.bucketId}`
      })
    }
  }) as unknown as z.ZodType<BulkOperationDefinition>

const quote_ident = (name: string): string => {
  if (!IDENTIFIER.test(name)) throw new BulkQueryError(`Identifiant invalide : ${name}`)
  return `"${name}"`
}

const table_exists = (db: Database, table: string): boolean => {
  const row = db
    .query<{ n: number }, [string]>(
      `SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = ?`
    )
    .get(table)
  return (row?.n ?? 0) > 0
}

const table_columns = (db: Database, table: string): Set<string> =>
  new Set(
    db
      .query<{ name: string }, []>(`PRAGMA table_info(${quote_ident(table)})`)
      .all()
      .map((row) => row.name)
  )

export type CompiledQuery = {
  sql: string
  params: Array<string | number>
}

const parse_bound = (raw: string | undefined): number | null => parsed_bound(raw)

export const compile_query = (
  definition: BulkOperationQueryDefinition,
  existing_columns: Set<string>,
  has_contacts = false,
  lots_columns = new Set<string>(),
  has_activities = true
): CompiledQuery => {
  const parsed = BulkOperationQueryDefinitionSchema.parse({
    source: definition.source,
    requiredBuckets: definition.requiredBuckets,
    requiredActions: definition.requiredActions,
    requiredTags: definition.requiredTags,
    excludedTags: definition.excludedTags,
    amountRange: definition.amountRange,
    unpaidMonthsRange: definition.unpaidMonthsRange
  })
  if (!existing_columns.has('id_locataire')) {
    throw new BulkQueryError(`La table ${COMPTES_LOCATAIRES_TABLE} n’a pas de colonne id_locataire`)
  }
  if (!existing_columns.has('montant_en_euros')) {
    throw new BulkQueryError(
      `La table ${COMPTES_LOCATAIRES_TABLE} n’a pas de colonne montant_en_euros`
    )
  }

  const movement_column_list: LedgerColumnMeta[] = [...existing_columns].map((name) => ({
    name,
    type: 'TEXT'
  }))
  const ledgerSql = build_ledger_view_sql(
    movement_column_list,
    lots_columns.size > 0,
    lots_columns,
    has_contacts
  )
  const params: Array<string | number> = []
  const where: string[] = []
  const from = parse_bound(parsed.amountRange?.from)
  const to = parse_bound(parsed.amountRange?.to)
  if (from != null) {
    where.push('ledger.solde_locataire >= ?')
    params.push(from)
  }
  if (to != null) {
    where.push('ledger.solde_locataire <= ?')
    params.push(to)
  }

  const monthsFrom = parse_bound(parsed.unpaidMonthsRange?.from)
  const monthsTo = parse_bound(parsed.unpaidMonthsRange?.to)
  if (monthsFrom != null) {
    where.push('ledger.ratio_dette_loyer >= ?')
    params.push(monthsFrom)
  }
  if (monthsTo != null) {
    where.push('ledger.ratio_dette_loyer <= ?')
    params.push(monthsTo)
  }

  const usesTags = parsed.requiredTags.length > 0 || parsed.excludedTags.length > 0
  let tagCtes = ''
  if (usesTags) {
    tagCtes = has_activities
      ? `WITH ranked_tag_snapshots AS (
  SELECT id_locataire, contenu,
    ROW_NUMBER() OVER (PARTITION BY id_locataire ORDER BY date_creation DESC, id DESC) AS rn
  FROM activites
  WHERE type = 'case_tag_change'
    AND rattachement = 'repayment:' || id_locataire
),
current_repayment_tags AS (
  SELECT snapshots.id_locataire, CAST(tag.value AS TEXT) AS tag
  FROM ranked_tag_snapshots snapshots
  JOIN json_each(
    CASE WHEN json_valid(snapshots.contenu) THEN snapshots.contenu ELSE '{"tags":[]}' END,
    '$.tags'
  ) tag
  WHERE snapshots.rn = 1
)`
      : `WITH current_repayment_tags AS (
  SELECT NULL AS id_locataire, NULL AS tag WHERE 0
)`
    for (const tag of parsed.requiredTags) {
      where.push(
        'EXISTS (SELECT 1 FROM current_repayment_tags tags WHERE tags.id_locataire = ledger.id_locataire AND tags.tag = ?)'
      )
      params.push(tag)
    }
    for (const tag of parsed.excludedTags) {
      where.push(
        'NOT EXISTS (SELECT 1 FROM current_repayment_tags tags WHERE tags.id_locataire = ledger.id_locataire AND tags.tag = ?)'
      )
      params.push(tag)
    }
  }

  const sql = `${tagCtes}${tagCtes ? '\n' : ''}SELECT ledger.*
FROM (${ledgerSql}) ledger${where.length ? `\nWHERE ${where.join('\n  AND ')}` : ''}`
  return { sql, params }
}

export const execute_query = (db: Database, compiled: CompiledQuery): Record<string, unknown>[] => {
  const rows = db
    .query<Record<string, unknown>, Array<string | number>>(compiled.sql)
    .all(...compiled.params)
  const seen = new Set<string>()
  for (const row of rows) {
    const id = row['id_locataire']
    if (typeof id !== 'string' || id.trim() === '') {
      throw new BulkQueryError('Chaque ligne doit porter un id_locataire')
    }
    if (seen.has(id)) {
      throw new BulkQueryError('La requête doit retourner un id_locataire unique par ligne')
    }
    seen.add(id)
  }
  return rows
}

const compile_for_db = (
  db: Database,
  definition: BulkOperationQueryDefinition | BulkOperationDefinition
): CompiledQuery => {
  if (definition.source !== 'comptes_locataires') {
    throw new BulkQueryError(`Source non implémentée : ${definition.source}`, 'not_implemented')
  }
  if (!table_exists(db, COMPTES_LOCATAIRES_TABLE)) {
    throw new BulkQueryError(`Table absente du datastore : ${COMPTES_LOCATAIRES_TABLE}`)
  }
  return compile_query(
    definition,
    table_columns(db, COMPTES_LOCATAIRES_TABLE),
    table_exists(db, CONTACTS_TABLE),
    table_exists(db, LOTS_TABLE) ? table_columns(db, LOTS_TABLE) : new Set<string>(),
    table_exists(db, 'activites')
  )
}

export const compile_and_run = (
  db: Database,
  definition: BulkOperationQueryDefinition
): CompiledQuery & {
  rows: Record<string, unknown>[]
} => {
  const compiled = compile_for_db(db, definition)
  return { ...compiled, rows: execute_query(db, compiled) }
}
