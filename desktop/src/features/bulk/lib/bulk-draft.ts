import { defaultRepaymentPhase } from '@/features/repayment/lib/repayment-bucket'
import {
  type BulkOperationDefinition,
  type BulkOperationRecord,
  emptyBulkOperationDefinition,
  type SimpleDeliveryStep
} from '@/shared/types/bulk-operations'
import type { LedgerColumnMeta } from '@/shared/types/ledger'

export type BulkDraft = {
  name: string
  description: string
  definition: BulkOperationDefinition
  reportsToKeep: string
}

export function bulkOperationWriteBody(draft: BulkDraft) {
  return {
    name: draft.name.trim(),
    description: draft.description,
    definition: draft.definition,
    reportsToKeep: Number(draft.reportsToKeep)
  }
}

export function bulkOperationCreatePayload(url: string, draft: BulkDraft) {
  return { url, ...bulkOperationWriteBody(draft) }
}

export function bulkOperationPatchPayload(url: string, id: string, draft: BulkDraft) {
  return { url, id, patch: bulkOperationWriteBody(draft) }
}

export function reportsToKeepError(value: string): string | null {
  const number = Number(value)
  return Number.isInteger(number) && number >= 1
    ? null
    : 'Saisissez un nombre entier supérieur ou égal à 1.'
}

export function bulkOperationExecutePayload(
  url: string,
  id: string,
  mode: 'send' | 'apply_without_send',
  clientCommandId: string
) {
  return { url, id, mode, clientCommandId }
}

function newBulkOperationCommandId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `cmd-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

export function nextBulkOperationCommandId(
  current: string | null,
  create: () => string = newBulkOperationCommandId
): string {
  return current ?? create()
}

export function draftFromRecord(record: BulkOperationRecord | null): BulkDraft {
  if (!record) {
    return {
      name: '',
      description: '',
      definition: { ...emptyBulkOperationDefinition(), bucketId: defaultRepaymentPhase() },
      reportsToKeep: '10'
    }
  }
  return {
    name: record.name,
    description: record.description,
    definition: record.definition,
    reportsToKeep: String(record.reportsToKeep)
  }
}

export function reconcilePlaceholderBindings(
  placeholders: string[],
  bindings: Record<string, string>
): Record<string, string> {
  return Object.fromEntries(
    placeholders.map((placeholder) => [placeholder, bindings[placeholder] ?? ''])
  )
}

function placeholderColumnItems(
  columns: LedgerColumnMeta[]
): Array<{ value: string; label: string }> {
  const names = new Set<string>()
  return [
    { value: 'date_du_jour', label: 'Date du jour (date_du_jour)' },
    ...columns.flatMap((column) => {
      if (!column.name || names.has(column.name) || column.name === 'date_du_jour') return []
      names.add(column.name)
      return [{ value: column.name, label: column.name }]
    })
  ]
}

type PlaceholderColumnLoader = (params: { url: string; limit: number }) => Promise<{
  meta: { columns: LedgerColumnMeta[] }
} | null>

export async function loadPlaceholderColumnItems(
  url: string,
  getLedger: PlaceholderColumnLoader | undefined = window.api?.getLedgerMeta
): Promise<Array<{ value: string; label: string }>> {
  if (!getLedger) throw new Error('Impossible de charger les colonnes disponibles.')
  const response = await getLedger({ url, limit: 1 })
  if (!response?.meta?.columns) throw new Error('Impossible de charger les colonnes disponibles.')
  return placeholderColumnItems(response.meta.columns)
}

export function restrictBindingsToColumns(
  definition: BulkOperationDefinition,
  columns: ReadonlySet<string>
): BulkOperationDefinition {
  const restrict = (bindings: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(bindings).map(([placeholder, column]) => [
        placeholder,
        columns.has(column) ? column : ''
      ])
    )
  if (definition.delivery.kind === 'rich_rcs') {
    return {
      ...definition,
      delivery: {
        ...definition.delivery,
        placeholderBindings: restrict(definition.delivery.placeholderBindings)
      }
    }
  }
  return {
    ...definition,
    delivery: {
      ...definition.delivery,
      steps: definition.delivery.steps.map((step) => ({
        ...step,
        placeholderBindings: restrict(step.placeholderBindings)
      })) as [SimpleDeliveryStep, ...SimpleDeliveryStep[]]
    }
  }
}
