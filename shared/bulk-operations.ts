import { rich_rcs_graph_issues } from './bulk-rich-rcs'

export const BULK_MEDIA = ['rcs', 'sms', 'email', 'courrier', 'lrar', 'lre'] as const
export type BulkMedium = (typeof BULK_MEDIA)[number]

export const BULK_SOURCES = [
  'comptes_locataires',
  'lots_locatifs',
  'candidats',
  'reclamations'
] as const
export type BulkSource = (typeof BULK_SOURCES)[number]

const BULK_EXECUTION_MODES = ['send', 'apply_without_send'] as const
export type BulkExecutionMode = (typeof BULK_EXECUTION_MODES)[number]

type AmountRange = {
  from?: string
  to?: string
}

export type PlaceholderBindings = Record<string, string>

export type SimpleDeliveryStep =
  | {
      medium: 'rcs' | 'sms'
      action: string
      body: string
      placeholderBindings: PlaceholderBindings
    }
  | {
      medium: 'email' | 'lre'
      action: string
      subject: string
      body: string
      placeholderBindings: PlaceholderBindings
    }
  | {
      medium: 'courrier' | 'lrar'
      action: string
      filename: string
      fileBase64: string
      placeholders: string[]
      placeholderBindings: PlaceholderBindings
      summary: string
    }

export type BulkRichRcsNode = {
  id: string
  body: string
  richContent: Record<string, unknown>
  transitions: Record<string, string | null>
}

export type BulkDelivery =
  | {
      kind: 'fallback'
      steps: [SimpleDeliveryStep, ...SimpleDeliveryStep[]]
    }
  | {
      kind: 'rich_rcs'
      action: string
      nodes: [BulkRichRcsNode, ...BulkRichRcsNode[]]
      placeholderBindings: PlaceholderBindings
      replyTimeoutHours: number
    }

export type BulkOperationDefinition = {
  source: BulkSource
  bucketId: string
  delivery: BulkDelivery
  notifyManager: boolean
  requiredBuckets: string[]
  requiredActions: string[]
  requiredTags: string[]
  excludedTags: string[]
  amountRange?: AmountRange
  unpaidMonthsRange?: AmountRange
}

export type BulkOperationQueryDefinition = Pick<
  BulkOperationDefinition,
  | 'source'
  | 'requiredBuckets'
  | 'requiredActions'
  | 'requiredTags'
  | 'excludedTags'
  | 'amountRange'
  | 'unpaidMonthsRange'
>

export const emptyBulkOperationQueryDefinition = (): BulkOperationQueryDefinition => ({
  source: 'comptes_locataires',
  requiredBuckets: [],
  requiredActions: [],
  requiredTags: [],
  excludedTags: []
})

export const emptyBulkOperationDefinition = (): BulkOperationDefinition => ({
  source: 'comptes_locataires',
  bucketId: 'non_traites',
  delivery: {
    kind: 'fallback',
    steps: [
      {
        medium: 'rcs',
        action: 'Envoyer un RCS de relance',
        body: '',
        placeholderBindings: {}
      }
    ]
  },
  notifyManager: false,
  requiredBuckets: [],
  requiredActions: [],
  requiredTags: [],
  excludedTags: []
})

export type BulkOperationEdit = {
  by: string
  at: string
}

export type BulkOperationRecord = {
  id: string
  name: string
  description: string
  definition: BulkOperationDefinition
  reportsToKeep: number
  edits: BulkOperationEdit[]
  lastRunAt: string | null
}

export type BulkOperationSummary = Omit<BulkOperationRecord, 'definition'>

export type CreateBulkOperationBody = {
  name: string
  description?: string
  definition: BulkOperationDefinition
  reportsToKeep?: number
}

export type PatchBulkOperationBody = {
  name?: string
  description?: string
  definition?: BulkOperationDefinition
  reportsToKeep?: number
}

const PREVIEW_ROW_STATUSES = ['eligible', 'no_usable_route'] as const
type PreviewRowStatus = (typeof PREVIEW_ROW_STATUSES)[number]

export type PreviewStepReason =
  | { code: 'missing_destination' }
  | { code: 'unverified_contact' }
  | { code: 'invalid_contact' }
  | { code: 'incompatible_contact'; status: string }
  | { code: 'missing_content' }
  | { code: 'missing_file' }
  | { code: 'missing_placeholders'; placeholders: string[] }

export type SkippedDeliveryStep = {
  medium: BulkMedium
  stepIndex: number
  reasons: PreviewStepReason[]
}

type PreviewRoute =
  | { kind: 'fallback'; medium: BulkMedium; stepIndex: number }
  | { kind: 'rich_rcs'; medium: 'rcs' }

export type PreviewRow = {
  id_locataire: string
  id_client: string | null
  nom: string | null
  email: string | null
  telephone: string | null
  adresse: string | null
  gestionnaire: string | null
  gestionnaire_email: string | null
  values: Record<string, unknown>
  status: PreviewRowStatus
  route: PreviewRoute | null
  skippedSteps: SkippedDeliveryStep[]
}

export type PreviewQueryResult = {
  sql: string
  rows: PreviewRow[]
  totals: {
    total: number
    eligible: number
    no_usable_route: number
  }
}

export type BulkOperationExecuteResult = {
  execution_id: string
  totals: {
    total: number
    queued: number
    no_usable_route: number
    applied: number
  }
}

const BULK_ITEM_REPORT_STATUSES = ['in_progress', 'ok', 'ko'] as const
export type BulkItemReportStatus = (typeof BULK_ITEM_REPORT_STATUSES)[number]

const BULK_RUN_REPORT_STATUSES = ['in_progress', 'ok', 'ko', 'partial'] as const
export type BulkRunReportStatus = (typeof BULK_RUN_REPORT_STATUSES)[number]

export type BulkReportCounts = {
  total: number
  in_progress: number
  ok: number
  ko: number
}

export type BulkReportSummary = {
  bulkOperationId: string
  executionId: string
  source: BulkSource
  mode: BulkExecutionMode
  status: BulkRunReportStatus
  counts: BulkReportCounts
  confirmedAt: string
  completedAt: string | null
  actor: string
  result: BulkOperationExecuteResult
}

export type BulkReportItem = {
  id: string
  executionId: string
  itemId: string
  source: BulkSource
  mode: BulkExecutionMode
  reportStatus: BulkItemReportStatus
  outcome: Record<string, unknown> | null
  currentActivityId: number | null
  completedAt: string | null
  runAt: string | null
  attempts: number
  lastError: string | null
  payload: Record<string, unknown>
}

export type BulkReportDetail = {
  report: BulkReportSummary
  items: BulkReportItem[]
}

export type PreviewMessageResult =
  | {
      kind: 'text'
      medium: Exclude<BulkMedium, 'courrier' | 'lrar'>
      rendered: string
      subject?: string
      placeholders: Record<string, string>
    }
  | {
      kind: 'pdf'
      medium: 'courrier' | 'lrar'
      filename: string
      pdfBase64: string
      mimeType: 'application/pdf'
    }
  | {
      kind: 'rich_rcs'
      medium: 'rcs'
      nodeId: string
      body: string
      richContent: Record<string, unknown>
      placeholders: Record<string, string>
    }

export type BulkRichRcsResponse = {
  nodeId: string
  postback: string | null
  label: string | null
  text: string
  activityId: number
  occurredAt: string
}

export function lastBulkOperationEdit(edits: BulkOperationEdit[]): BulkOperationEdit | null {
  return edits.at(-1) ?? null
}

export function deliveryAction(delivery: BulkDelivery): string {
  return delivery.kind === 'rich_rcs' ? delivery.action : delivery.steps[0].action
}

const PLACEHOLDER_RE = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g

export function collectBulkPlaceholders(values: unknown[]): string[] {
  const placeholders = new Set<string>()
  for (const value of values) {
    const source = typeof value === 'string' ? value : JSON.stringify(value)
    for (const match of source.matchAll(PLACEHOLDER_RE)) placeholders.add(match[1]!)
  }
  return [...placeholders].sort((left, right) => left.localeCompare(right))
}

function stepPlaceholders(step: SimpleDeliveryStep): string[] {
  if ('placeholders' in step) return step.placeholders
  return collectBulkPlaceholders('subject' in step ? [step.subject, step.body] : [step.body])
}

export function bulkDeliveryError(delivery: BulkDelivery): string | null {
  if (delivery.kind === 'rich_rcs') {
    if (!delivery.action.trim()) return 'L’action RCS est requise.'
    if (
      delivery.replyTimeoutHours < 1 ||
      delivery.replyTimeoutHours > 720 ||
      !Number.isInteger(delivery.replyTimeoutHours)
    ) {
      return 'Le délai de réponse doit être un nombre entier entre 1 et 720 heures.'
    }
    const graphIssues = rich_rcs_graph_issues(delivery.nodes)
    if (graphIssues.length > 0) return graphIssues[0]!
    const placeholders = collectBulkPlaceholders(
      delivery.nodes.flatMap((node) => [node.body, node.richContent])
    )
    if (placeholders.some((placeholder) => !delivery.placeholderBindings[placeholder]?.trim())) {
      return 'Toutes les liaisons de placeholders sont requises.'
    }
    return null
  }
  if (delivery.steps.length === 0) return 'Au moins une étape de livraison est requise.'
  for (const step of delivery.steps) {
    if (!step.action.trim()) return 'Chaque action est requise.'
    if ('fileBase64' in step) {
      if (!step.filename || !step.fileBase64)
        return 'Chaque courrier doit contenir un fichier Word.'
      if (!step.summary.trim()) return 'Décrivez le contenu du courrier.'
    } else if (!step.body.trim()) {
      return 'Le contenu de chaque message est requis.'
    }
    if (
      stepPlaceholders(step).some((placeholder) => !step.placeholderBindings[placeholder]?.trim())
    ) {
      return 'Toutes les liaisons de placeholders sont requises.'
    }
  }
  return null
}
