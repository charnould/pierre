import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Building2,
  Database,
  Eye,
  FileUp,
  MessageSquare,
  Plus,
  Trash2,
  Users
} from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { BulkTemplateField } from '@/features/outreach/components/BulkTemplateField'
import { inspectBulkDocx } from '@/features/outreach/lib/bulk-docx'
import { bindMatchingPlaceholders } from '@/features/outreach/lib/bulk-template-command'
import { contactColumnKind } from '@/features/outreach/lib/channel-feasibility'
import {
  formatPreviewChannelTotals,
  MEDIUM_LABELS,
  PREVIEW_STATUS_LABELS,
  previewStepReasonLabel
} from '@/features/outreach/lib/labels'
import { resolveContactStatusBadge } from '@/features/repayment/lib/contact-status'
import {
  REPAYMENT_ACTION_OPTIONS,
  REPAYMENT_BULK_ACTION_OPTIONS
} from '@/features/repayment/lib/repayment-action'
import { REPAYMENT_BUCKET_OPTIONS } from '@/features/repayment/lib/repayment-bucket'
import { REPAYMENT_TAG_OPTIONS } from '@/features/repayment/lib/repayment-tags'
import { ChoiceTile } from '@/shared/components/ChoiceTile'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { CartoonBulkSelectFiles } from '@/shared/components/icons/koboyo-empty'
import { SelectItems } from '@/shared/components/SelectItems'
import { VirtualizedTableBody } from '@/shared/components/table/VirtualizedTableBody'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Slider } from '@/shared/components/ui/slider'
import { TableCell, TableRow } from '@/shared/components/ui/table'
import { Textarea } from '@/shared/components/ui/textarea'
import { toast } from '@/shared/components/ui/toast'
import {
  BULK_MEDIA,
  bulkDeliveryError,
  collectBulkPlaceholders,
  collect_rich_rcs_replies,
  emptyBulkOperationDefinition,
  rich_rcs_graph_issues,
  type BulkMedium,
  type BulkOperationDefinition,
  type BulkOperationRecord,
  type BulkRichRcsNode,
  type BulkSource,
  type PreviewMessageResult,
  type PreviewQueryResult,
  type PreviewRow,
  type SimpleDeliveryStep
} from '@/shared/types/bulk-operations'
import type { LedgerColumnMeta } from '@/shared/types/ledger'

export { bulkDeliveryError, collectBulkPlaceholders }

type Draft = {
  name: string
  description: string
  definition: BulkOperationDefinition
  reportsToKeep: string
}

export function bulkOperationWriteBody(draft: Draft) {
  return {
    name: draft.name.trim(),
    description: draft.description,
    definition: draft.definition,
    reportsToKeep: Number(draft.reportsToKeep)
  }
}

export function bulkOperationCreatePayload(url: string, draft: Draft) {
  return { url, ...bulkOperationWriteBody(draft) }
}

export function bulkOperationPatchPayload(url: string, id: string, draft: Draft) {
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

function draftFrom(record: BulkOperationRecord | null): Draft {
  if (!record) {
    return {
      name: '',
      description: '',
      definition: emptyBulkOperationDefinition(),
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
  getLedger: PlaceholderColumnLoader | undefined = window.api?.getLedger
): Promise<Array<{ value: string; label: string }>> {
  if (!getLedger) throw new Error('Impossible de charger les colonnes disponibles.')
  const response = await getLedger({ url, limit: 1 })
  if (!response?.meta?.columns) throw new Error('Impossible de charger les colonnes disponibles.')
  return placeholderColumnItems(response.meta.columns)
}

function restrictBindingsToColumns(
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

function createDeliveryStep(medium: BulkMedium, action: string): SimpleDeliveryStep {
  if (medium === 'email' || medium === 'lre') {
    return { medium, action, subject: '', body: '', placeholderBindings: {} }
  }
  if (medium === 'courrier' || medium === 'lrar') {
    return {
      medium,
      action,
      filename: '',
      fileBase64: '',
      placeholders: [],
      placeholderBindings: {},
      summary: ''
    }
  }
  return { medium, action, body: '', placeholderBindings: {} }
}

function stepPlaceholders(step: SimpleDeliveryStep): string[] {
  if ('placeholders' in step) return step.placeholders
  return collectBulkPlaceholders('subject' in step ? [step.subject, step.body] : [step.body])
}

function PlaceholderBindingsEditor({
  idPrefix,
  placeholders,
  bindings,
  columnItems,
  columnsLoading,
  columnsError,
  onChange
}: {
  idPrefix: string
  placeholders: string[]
  bindings: Record<string, string>
  columnItems: Array<{ value: string; label: string }>
  columnsLoading: boolean
  columnsError: string | null
  onChange: (bindings: Record<string, string>) => void
}) {
  if (placeholders.length === 0) return null
  return (
    <Field data-invalid={columnsError ? '' : undefined}>
      <FieldLabel>Variables</FieldLabel>
      <FieldDescription>
        Indiquez quelle colonne alimente chaque variable du message.
      </FieldDescription>
      <div className="flex flex-col gap-2">
        {placeholders.map((placeholder) => {
          const id = `${idPrefix}-binding-${placeholder}`
          return (
            <Field key={placeholder} orientation="horizontal">
              <FieldLabel htmlFor={id} className="shrink-0">
                {`{{${placeholder}}}`}
              </FieldLabel>
              <Select
                items={columnItems}
                value={bindings[placeholder] || null}
                disabled={columnsLoading || columnsError !== null}
                onValueChange={(column) =>
                  column && onChange({ ...bindings, [placeholder]: column })
                }
              >
                <SelectTrigger id={id} className="min-w-0 flex-1">
                  <SelectValue
                    placeholder={columnsLoading ? 'Chargement…' : 'Choisir une colonne'}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItems items={columnItems} />
                </SelectContent>
              </Select>
            </Field>
          )
        })}
      </div>
      {columnsError ? <FieldError>{columnsError}</FieldError> : null}
    </Field>
  )
}

function JsonObjectField({
  id,
  value,
  onChange
}: {
  id: string
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
}) {
  const serialized = useMemo(() => JSON.stringify(value, null, 2), [value])
  const [draft, setDraft] = useState(serialized)
  const [error, setError] = useState<string | null>(null)
  const [appliedSerialized, setAppliedSerialized] = useState(serialized)
  if (appliedSerialized !== serialized) {
    setAppliedSerialized(serialized)
    setDraft(serialized)
    setError(null)
  }
  return (
    <Field data-invalid={error ? '' : undefined}>
      <FieldLabel htmlFor={id}>Contenu RCS enrichi (JSON)</FieldLabel>
      <Textarea
        id={id}
        rows={8}
        className="font-mono"
        value={draft}
        aria-invalid={error ? true : undefined}
        onChange={(event) => {
          const next = event.target.value
          setDraft(next)
          try {
            const parsed: unknown = JSON.parse(next)
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
              throw new Error('Le contenu doit être un objet JSON.')
            }
            setError(null)
            onChange(parsed as Record<string, unknown>)
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'JSON invalide.')
          }
        }}
      />
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  )
}

export function BulkMessagePreview({ preview }: { preview: PreviewMessageResult }) {
  if (preview.kind === 'pdf') {
    return (
      <object
        aria-label={preview.filename}
        className="h-[60vh] w-full rounded-md border"
        data={`data:${preview.mimeType};base64,${preview.pdfBase64}`}
        type={preview.mimeType}
      />
    )
  }
  if (preview.kind === 'rich_rcs') {
    return (
      <div className="space-y-4">
        <p className="whitespace-pre-wrap">{preview.body}</p>
        <pre className="overflow-x-auto font-mono text-[0.8125rem] leading-[1.125rem] whitespace-pre-wrap">
          {JSON.stringify(preview.richContent, null, 2)}
        </pre>
      </div>
    )
  }
  return (
    <pre className="overflow-x-auto font-mono text-[0.8125rem] leading-[1.125rem] whitespace-pre-wrap">
      {preview.rendered}
    </pre>
  )
}

const SOURCE_OPTIONS: Array<{
  value: BulkSource
  label: string
  icon: typeof Database
  available: boolean
}> = [
  { value: 'comptes_locataires', label: 'Comptes locataires', icon: Database, available: true },
  { value: 'lots_locatifs', label: 'Lots locatifs', icon: Building2, available: false },
  { value: 'candidats', label: 'Candidats', icon: Users, available: false },
  { value: 'reclamations', label: 'Réclamations', icon: MessageSquare, available: false }
]

const RICH_RCS_EDITOR_AVAILABLE = false

function formatMontant(value: unknown): string {
  if (value == null || value === '') return '—'
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return String(value)
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(number)
}

function PreviewValueCell({ column, row }: { column: string; row: PreviewRow }) {
  const value =
    column === 'email_client'
      ? row.email
      : column === 'telephone_client'
        ? row.telephone
        : row.values[column]
  const text =
    column === 'montant_en_euros'
      ? formatMontant(value)
      : value == null || value === ''
        ? '—'
        : String(value)
  const kind = contactColumnKind(column)
  if (kind === 'email' || kind === 'telephone') {
    const status = kind === 'email' ? row.values['email_status'] : row.values['telephone_status']
    const badge = resolveContactStatusBadge(value, status, kind)
    return (
      <span className="inline-flex items-center gap-1.5">
        <span>{text}</span>
        {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null}
      </span>
    )
  }
  return text
}

function RangeField({
  label,
  description,
  range,
  min,
  max,
  step,
  unit,
  onCommit
}: {
  label: string
  description: string
  range?: { from?: string; to?: string }
  min: number
  max: number
  step: number
  unit: string
  onCommit: (range: { from: string; to: string } | undefined) => void
}) {
  const id = useId()
  const enabled = range !== undefined
  const committedValue = useMemo<[number, number]>(
    () => [Number(range?.from ?? min), Number(range?.to ?? max)],
    [max, min, range?.from, range?.to]
  )
  const [value, setValue] = useState<[number, number]>(committedValue)
  const [appliedValue, setAppliedValue] = useState(committedValue)
  if (appliedValue[0] !== committedValue[0] || appliedValue[1] !== committedValue[1]) {
    setAppliedValue(committedValue)
    setValue(committedValue)
  }

  function commit(next: number | readonly number[]) {
    const values = typeof next === 'number' ? [next, next] : next
    const normalized: [number, number] = [values[0] ?? min, values[1] ?? max]
    setValue(normalized)
    onCommit({ from: String(normalized[0]), to: String(normalized[1]) })
  }

  return (
    <Field>
      <div className="flex items-start gap-2">
        <Checkbox
          id={id}
          checked={enabled}
          onCheckedChange={(checked) => {
            if (checked === true) commit(value)
            else onCommit(undefined)
          }}
        />
        <div className="min-w-0">
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <FieldDescription>{description}</FieldDescription>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="w-24 text-start tabular-nums">
          {value[0].toLocaleString('fr-FR')} {unit}
        </span>
        <Slider
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={!enabled}
          getAriaLabel={(index) => `${label}, ${index === 0 ? 'minimum' : 'maximum'}`}
          getAriaValueText={(_, current) => `${current.toLocaleString('fr-FR')} ${unit}`}
          onValueChange={(next) => {
            const values = typeof next === 'number' ? [next, next] : next
            setValue([values[0] ?? min, values[1] ?? max])
          }}
          onValueCommitted={commit}
        />
        <span className="w-24 text-start tabular-nums">
          {value[1].toLocaleString('fr-FR')} {unit}
        </span>
      </div>
    </Field>
  )
}

function TagSelection({
  label,
  description,
  items = REPAYMENT_TAG_OPTIONS.map((tag) => ({ value: tag, label: tag })),
  value,
  excluded,
  onChange
}: {
  label: string
  description: string
  items?: Array<{ value: string; label: string }>
  value: string[]
  excluded: string[]
  onChange: (value: string[]) => void
}) {
  const id = useId()
  const selected = new Set(value)
  const unavailable = new Set(excluded)

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <FieldDescription>{description}</FieldDescription>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item, index) => {
          const inputId = `${id}-${index}`
          return (
            <Field key={item.value} orientation="horizontal">
              <Checkbox
                id={inputId}
                checked={selected.has(item.value)}
                disabled={unavailable.has(item.value)}
                onCheckedChange={(checked) =>
                  onChange(
                    checked === true
                      ? [...value, item.value]
                      : value.filter((valueItem) => valueItem !== item.value)
                  )
                }
              />
              <FieldLabel htmlFor={inputId} className="font-normal">
                {item.label}
              </FieldLabel>
            </Field>
          )
        })}
      </div>
    </Field>
  )
}

interface Props {
  url: string
  record: BulkOperationRecord | null
  onBack: () => void
  onSaved: (record: BulkOperationRecord) => void
  onArchived: () => void
}

export function BulkEditor({ url, record, onBack, onSaved, onArchived }: Props) {
  const nomField = useId()
  const descField = useId()
  const reportsToKeepField = useId()
  const notifyManagerField = useId()

  const [draft, setDraft] = useState<Draft>(() => draftFrom(record))
  const [savedId, setSavedId] = useState(record?.id ?? null)
  const [preview, setPreview] = useState<PreviewQueryResult | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [confirmApply, setConfirmApply] = useState(false)
  const [confirmApplyWithoutSend, setConfirmApplyWithoutSend] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [messagePreview, setMessagePreview] = useState<PreviewMessageResult | null>(null)
  const [planAnnouncement, setPlanAnnouncement] = useState('')
  const [placeholderSnapshot, setPlaceholderSnapshot] = useState<{
    url: string
    items: Array<{ value: string; label: string }>
    error: string | null
  }>({ url: '', items: [], error: null })
  const [appliedRecord, setAppliedRecord] = useState(record)
  const previewGen = useRef(0)
  const executionCommandId = useRef<string | null>(null)
  const planRowRefs = useRef<Array<HTMLDivElement | null>>([])
  const resultsScrollRef = useRef<HTMLDivElement>(null)
  const placeholderColumns = placeholderSnapshot.url === url ? placeholderSnapshot.items : []
  const placeholderColumnsError = placeholderSnapshot.url === url ? placeholderSnapshot.error : null
  const placeholderColumnsLoading = placeholderSnapshot.url !== url
  const sourceSupported = draft.definition.source === 'comptes_locataires'
  const fallbackDelivery =
    draft.definition.delivery.kind === 'fallback' ? draft.definition.delivery : null
  const richDelivery =
    draft.definition.delivery.kind === 'rich_rcs' ? draft.definition.delivery : null
  const retentionError = reportsToKeepError(draft.reportsToKeep)
  const hasPlaceholders =
    draft.definition.delivery.kind === 'rich_rcs'
      ? collectBulkPlaceholders(
          draft.definition.delivery.nodes.flatMap((node) => [node.body, node.richContent])
        ).length > 0
      : draft.definition.delivery.steps.some((step) => stepPlaceholders(step).length > 0)
  const placeholderColumnsUnavailable =
    hasPlaceholders && (placeholderColumnsLoading || placeholderColumnsError !== null)
  const bulkActionItems = useMemo(
    () =>
      REPAYMENT_BULK_ACTION_OPTIONS.map((action) => ({ value: action.id, label: action.label })),
    []
  )

  const patchDraft = (partial: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...partial }))

  const patchDefinition = (partial: Partial<BulkOperationDefinition>) => {
    setDraft((current) => ({
      ...current,
      definition: { ...current.definition, ...partial }
    }))
  }

  useEffect(() => {
    let cancelled = false
    void loadPlaceholderColumnItems(url).then(
      (items) => {
        if (cancelled) return
        const available = new Set(items.map((item) => item.value))
        setPlaceholderSnapshot({ url, items, error: null })
        setDraft((current) => ({
          ...current,
          definition: restrictBindingsToColumns(current.definition, available)
        }))
      },
      () => {
        if (cancelled) return
        setPlaceholderSnapshot({
          url,
          items: [],
          error: 'Impossible de charger les colonnes disponibles.'
        })
      }
    )
    return () => {
      cancelled = true
    }
  }, [url])

  function patchDeliveryStep(index: number, step: SimpleDeliveryStep) {
    if (draft.definition.delivery.kind !== 'fallback') return
    patchDefinition({
      delivery: {
        ...draft.definition.delivery,
        steps: draft.definition.delivery.steps.map((candidate, stepIndex) =>
          stepIndex === index ? step : candidate
        ) as [SimpleDeliveryStep, ...SimpleDeliveryStep[]]
      }
    })
  }

  function focusPlanRow(index: number) {
    window.requestAnimationFrame(() => planRowRefs.current[index]?.focus())
  }

  function moveDeliveryStep(index: number, direction: -1 | 1) {
    if (draft.definition.delivery.kind !== 'fallback') return
    const target = index + direction
    if (target < 0 || target >= draft.definition.delivery.steps.length) return
    const steps = [...draft.definition.delivery.steps] as [
      SimpleDeliveryStep,
      ...SimpleDeliveryStep[]
    ]
    ;[steps[index], steps[target]] = [steps[target]!, steps[index]!]
    patchDefinition({ delivery: { kind: 'fallback', steps } })
    setPlanAnnouncement(`Étape déplacée au rang ${target + 1}`)
    focusPlanRow(target)
  }

  function removeDeliveryStep(index: number) {
    if (draft.definition.delivery.kind !== 'fallback') return
    if (draft.definition.delivery.steps.length === 1) return
    const steps = draft.definition.delivery.steps.filter((_, stepIndex) => stepIndex !== index) as [
      SimpleDeliveryStep,
      ...SimpleDeliveryStep[]
    ]
    patchDefinition({ delivery: { kind: 'fallback', steps } })
    setPlanAnnouncement(`Étape ${index + 1} supprimée`)
    focusPlanRow(Math.min(index, steps.length - 1))
  }

  function addDeliveryStep() {
    if (draft.definition.delivery.kind !== 'fallback') return
    const delivery = draft.definition.delivery
    const medium = BULK_MEDIA.find(
      (candidate) => !delivery.steps.some((step) => step.medium === candidate)
    )
    if (!medium) return
    const next = createDeliveryStep(medium, bulkActionItems[0]?.value ?? '')
    const steps = [...delivery.steps, next] as [SimpleDeliveryStep, ...SimpleDeliveryStep[]]
    patchDefinition({ delivery: { kind: 'fallback', steps } })
    setPlanAnnouncement(`Fallback ${steps.length - 1} ajouté`)
    focusPlanRow(steps.length - 1)
  }

  function patchRichNode(index: number, node: BulkRichRcsNode) {
    if (draft.definition.delivery.kind !== 'rich_rcs') return
    patchDefinition({
      delivery: {
        ...draft.definition.delivery,
        nodes: draft.definition.delivery.nodes.map((candidate, nodeIndex) =>
          nodeIndex === index ? node : candidate
        ) as [BulkRichRcsNode, ...BulkRichRcsNode[]]
      }
    })
  }

  function addRichNode() {
    if (draft.definition.delivery.kind !== 'rich_rcs') return
    const ids = new Set(draft.definition.delivery.nodes.map((node) => node.id))
    let number = draft.definition.delivery.nodes.length + 1
    while (ids.has(`message_${number}`)) number += 1
    patchDefinition({
      delivery: {
        ...draft.definition.delivery,
        nodes: [
          ...draft.definition.delivery.nodes,
          { id: `message_${number}`, body: '', richContent: {}, transitions: {} }
        ]
      }
    })
  }

  function removeRichNode(index: number) {
    if (draft.definition.delivery.kind !== 'rich_rcs') return
    if (draft.definition.delivery.nodes.length === 1) return
    const removedId = draft.definition.delivery.nodes[index]?.id
    const nodes = draft.definition.delivery.nodes
      .filter((_, nodeIndex) => nodeIndex !== index)
      .map((node) => ({
        ...node,
        transitions: Object.fromEntries(
          Object.entries(node.transitions).map(([postback, target]) => [
            postback,
            target === removedId ? null : target
          ])
        )
      })) as [BulkRichRcsNode, ...BulkRichRcsNode[]]
    patchDefinition({ delivery: { ...draft.definition.delivery, nodes } })
  }

  const persist = useCallback(async (): Promise<BulkOperationRecord | null> => {
    if (!window.api || !draft.name.trim() || retentionError) {
      toast.add({
        title: 'Le nom est requis',
        type: 'error'
      })
      return null
    }
    setSaving(true)
    try {
      const res = savedId
        ? await window.api.patchBulkOperation(bulkOperationPatchPayload(url, savedId, draft))
        : await window.api.createBulkOperation(bulkOperationCreatePayload(url, draft))
      if (!res) {
        toast.add({ title: 'Enregistrement impossible', type: 'error' })
        return null
      }
      setSavedId(res.data.id)
      onSaved(res.data)
      return res.data
    } finally {
      setSaving(false)
    }
  }, [draft, onSaved, retentionError, savedId, url])

  const runPreview = useCallback(
    async (definition: BulkOperationDefinition = draft.definition) => {
      if (
        definition.source !== 'comptes_locataires' ||
        !window.api?.previewBulkOperationQuery ||
        bulkDeliveryError(definition.delivery)
      )
        return
      const gen = ++previewGen.current
      setPreviewing(true)
      try {
        const res = await window.api.previewBulkOperationQuery({
          url,
          definition,
          bulkOperationId: savedId ?? undefined
        })
        if (gen !== previewGen.current) return
        if (!res) {
          toast.add({ title: 'Prévisualisation impossible', type: 'error' })
          return
        }
        setPreview(res.data)
      } finally {
        if (gen === previewGen.current) setPreviewing(false)
      }
    },
    [draft.definition, savedId, url]
  )

  useEffect(() => {
    if (
      !sourceSupported ||
      placeholderColumnsUnavailable ||
      bulkDeliveryError(draft.definition.delivery)
    )
      return
    const timer = window.setTimeout(() => {
      void runPreview(draft.definition)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [draft.definition, placeholderColumnsUnavailable, runPreview, sourceSupported])

  const openMessage = useCallback(
    async (row: PreviewRow, nodeId?: string) => {
      if (!window.api?.previewBulkOperationMessage || !row.route) return
      const res = await window.api.previewBulkOperationMessage({
        url,
        definition: draft.definition,
        id_locataire: row.id_locataire,
        bulkOperationId: savedId ?? undefined,
        nodeId
      })
      if (!res) {
        toast.add({ title: 'Aperçu du message impossible', type: 'error' })
        return
      }
      setMessagePreview(res.data)
    },
    [draft, savedId, url]
  )

  const handleApply = useCallback(
    async (send: boolean) => {
      setConfirmApply(false)
      setConfirmApplyWithoutSend(false)
      if (bulkDeliveryError(draft.definition.delivery)) return
      const saved = await persist()
      if (!saved || !window.api?.executeBulkOperation) return
      setSending(true)
      try {
        executionCommandId.current ??= nextBulkOperationCommandId(executionCommandId.current)
        const res = await window.api.executeBulkOperation(
          bulkOperationExecutePayload(
            url,
            saved.id,
            send ? 'send' : 'apply_without_send',
            executionCommandId.current
          )
        )
        if (!res) {
          toast.add({
            title: send ? 'Envoi impossible' : 'Application impossible',
            type: 'error'
          })
          return
        }
        const accepted = send ? res.data.totals.queued : res.data.totals.applied
        toast.add({
          title: send
            ? `${accepted} envoi${accepted === 1 ? '' : 's'} accepté${accepted === 1 ? '' : 's'}`
            : `${accepted} dossier${accepted === 1 ? '' : 's'} avancé${accepted === 1 ? '' : 's'}`,
          type: 'success'
        })
        await runPreview()
        executionCommandId.current = null
      } finally {
        setSending(false)
      }
    },
    [draft.definition.delivery, persist, runPreview, url]
  )

  const handleDelete = useCallback(async () => {
    setConfirmDelete(false)
    if (!savedId || !window.api?.deleteBulkOperation) return
    const res = await window.api.deleteBulkOperation({ url, id: savedId })
    if (!res) {
      toast.add({ title: 'Suppression impossible', type: 'error' })
      return
    }
    toast.add({ title: 'Traitement supprimé', type: 'success' })
    onArchived()
  }, [onArchived, savedId, url])

  if (appliedRecord !== record) {
    setAppliedRecord(record)
    setDraft(draftFrom(record))
    setSavedId(record?.id ?? null)
    setPreview(null)
    setMessagePreview(null)
  }

  const openApplyConfirm = (send: boolean) => {
    executionCommandId.current ??= nextBulkOperationCommandId(executionCommandId.current)
    const open = () => (send ? setConfirmApply(true) : setConfirmApplyWithoutSend(true))
    if (!sourceSupported) return
    if (!preview) {
      void runPreview().then(() => open())
      return
    }
    open()
  }

  const eligible = preview?.totals.eligible ?? 0
  const concerned = preview?.totals.total ?? 0
  const applyWithoutSendCount = preview?.totals.eligible ?? 0
  const channelTotals = preview ? formatPreviewChannelTotals(preview.rows) : ''

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-border bg-background sticky top-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b py-2 ps-2 pe-2">
        <div className="flex min-w-0 items-center gap-2">
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Retour" onClick={onBack}>
            <ArrowLeft />
          </Button>
          <h2 className="m-0 truncate font-sans text-xl leading-6 font-semibold tracking-tight">
            {draft.name.trim() || 'Nouveau traitement'}
          </h2>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {savedId ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              Supprimer
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={saving || retentionError !== null}
            onClick={() => void persist()}
          >
            Enregistrer
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={
              sending ||
              !sourceSupported ||
              placeholderColumnsUnavailable ||
              bulkDeliveryError(draft.definition.delivery) !== null
            }
            onClick={() => openApplyConfirm(false)}
          >
            Traiter sans envoyer
          </Button>
          <Button
            type="button"
            disabled={
              sending ||
              !sourceSupported ||
              placeholderColumnsUnavailable ||
              bulkDeliveryError(draft.definition.delivery) !== null
            }
            onClick={() => openApplyConfirm(true)}
          >
            Appliquer le traitement
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-6 py-6">
          <FieldGroup className="gap-6">
            <FieldSet>
              <FieldLegend>Traitement</FieldLegend>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={nomField}>Nom</FieldLabel>
                  <FieldDescription>
                    Affiché dans la liste des traitements, pour le retrouver et le réutiliser.
                  </FieldDescription>
                  <Input
                    id={nomField}
                    value={draft.name}
                    onChange={(event) => patchDraft({ name: event.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={descField}>Description</FieldLabel>
                  <FieldDescription>
                    Rappel de ce que fait le traitement, avant de le relancer.
                  </FieldDescription>
                  <Textarea
                    id={descField}
                    rows={3}
                    value={draft.description}
                    onChange={(event) => patchDraft({ description: event.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel>Source</FieldLabel>
                  <FieldDescription>
                    Dossiers sur lesquels le traitement travaille.
                  </FieldDescription>
                  <RadioGroup
                    value={draft.definition.source}
                    onValueChange={(source) =>
                      patchDefinition({ source: source as BulkOperationDefinition['source'] })
                    }
                    className="grid grid-cols-2"
                  >
                    {SOURCE_OPTIONS.map((option) => {
                      const inputId = `bulk-source-${option.value}`
                      const Icon = option.icon
                      return (
                        <ChoiceTile
                          key={option.value}
                          as="label"
                          htmlFor={inputId}
                          icon={<Icon />}
                          title={option.label}
                          caption={option.available ? undefined : 'Bientôt disponible'}
                          signal={
                            <RadioGroupItem
                              id={inputId}
                              value={option.value}
                              disabled={!option.available}
                            />
                          }
                          selected={draft.definition.source === option.value}
                          interactive
                          disabled={!option.available}
                        />
                      )
                    })}
                  </RadioGroup>
                </Field>
                <Field data-invalid={retentionError ? '' : undefined}>
                  <FieldLabel htmlFor={reportsToKeepField}>Rapports conservés</FieldLabel>
                  <FieldDescription>
                    Nombre d’exécutions terminées à garder dans l’historique.
                  </FieldDescription>
                  <Input
                    id={reportsToKeepField}
                    type="number"
                    min={1}
                    step={1}
                    value={draft.reportsToKeep}
                    aria-invalid={retentionError ? true : undefined}
                    onChange={(event) => patchDraft({ reportsToKeep: event.target.value })}
                  />
                  {retentionError ? <FieldError>{retentionError}</FieldError> : null}
                </Field>
                <Field orientation="horizontal">
                  <Checkbox
                    id={notifyManagerField}
                    checked={draft.definition.notifyManager}
                    onCheckedChange={(notifyManager) =>
                      patchDefinition({ notifyManager: notifyManager === true })
                    }
                  />
                  <div>
                    <FieldLabel htmlFor={notifyManagerField}>Notifier le référent</FieldLabel>
                    <FieldDescription>
                      Le référent du dossier est prévenu à chaque activité créée par cette
                      exécution.
                    </FieldDescription>
                  </div>
                </Field>
              </FieldGroup>
            </FieldSet>
            {sourceSupported ? (
              <>
                <FieldSet>
                  <FieldLegend>Acheminement</FieldLegend>
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Type</FieldLabel>
                      <FieldDescription>
                        Comment contacter : des canaux l’un après l’autre, ou un parcours RCS qui
                        enchaîne les messages selon les réponses.
                      </FieldDescription>
                      <RadioGroup
                        value={draft.definition.delivery.kind}
                        className="grid grid-cols-2"
                        onValueChange={(kind) => {
                          if (kind === 'fallback') {
                            patchDefinition({
                              delivery: {
                                kind: 'fallback',
                                steps: [createDeliveryStep('rcs', bulkActionItems[0]?.value ?? '')]
                              }
                            })
                          } else {
                            patchDefinition({
                              delivery: {
                                kind: 'rich_rcs',
                                action: bulkActionItems[0]?.value ?? '',
                                nodes: [
                                  {
                                    id: 'message_1',
                                    body: '',
                                    richContent: {},
                                    transitions: {}
                                  }
                                ],
                                placeholderBindings: {},
                                replyTimeoutHours: 72
                              }
                            })
                          }
                        }}
                      >
                        <ChoiceTile
                          as="label"
                          htmlFor="delivery-kind-fallback"
                          title="Canaux successifs"
                          caption="Si un canal échoue, le suivant est tenté"
                          signal={<RadioGroupItem id="delivery-kind-fallback" value="fallback" />}
                          selected={draft.definition.delivery.kind === 'fallback'}
                          interactive
                        />
                        <ChoiceTile
                          as="label"
                          htmlFor="delivery-kind-rich-rcs"
                          title="Parcours RCS"
                          caption="Messages enchaînés selon les réponses du locataire"
                          signal={<RadioGroupItem id="delivery-kind-rich-rcs" value="rich_rcs" />}
                          selected={draft.definition.delivery.kind === 'rich_rcs'}
                          interactive
                        />
                      </RadioGroup>
                    </Field>
                    {fallbackDelivery ? (
                      <Field>
                        <FieldLabel>Canaux</FieldLabel>
                        <FieldDescription>
                          Chaque canal n’apparaît qu’une fois. Le premier qui aboutit est utilisé.
                          Le contenu est enregistré dans le traitement.
                        </FieldDescription>
                        <div className="flex flex-col gap-2">
                          {fallbackDelivery.steps.map((step, index) => {
                            const mediumItems = BULK_MEDIA.map((medium) => ({
                              value: medium,
                              label: MEDIUM_LABELS[medium],
                              disabled: fallbackDelivery.steps.some(
                                (candidate, candidateIndex) =>
                                  candidateIndex !== index && candidate.medium === medium
                              )
                            }))
                            const placeholders = stepPlaceholders(step)
                            return (
                              <div
                                key={`${step.medium}-${index}`}
                                ref={(node) => {
                                  planRowRefs.current[index] = node
                                }}
                                tabIndex={-1}
                                className="focus-visible:ring-ring/40 rounded-md border p-4 outline-none focus-visible:ring-1"
                              >
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium">
                                    {index === 0 ? 'Canal initial' : `Fallback ${index}`}
                                  </p>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-xs"
                                      aria-label={`Monter ${index === 0 ? 'le canal initial' : `le fallback ${index}`}`}
                                      disabled={index === 0}
                                      onClick={() => moveDeliveryStep(index, -1)}
                                    >
                                      <ArrowUp />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-xs"
                                      aria-label={`Descendre ${index === 0 ? 'le canal initial' : `le fallback ${index}`}`}
                                      disabled={index === fallbackDelivery.steps.length - 1}
                                      onClick={() => moveDeliveryStep(index, 1)}
                                    >
                                      <ArrowDown />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-xs"
                                      aria-label={`Supprimer ${index === 0 ? 'le canal initial' : `le fallback ${index}`}`}
                                      disabled={fallbackDelivery.steps.length === 1}
                                      onClick={() => removeDeliveryStep(index)}
                                    >
                                      <Trash2 />
                                    </Button>
                                  </div>
                                </div>
                                <FieldGroup>
                                  <div className="grid grid-cols-2 gap-2">
                                    <Field>
                                      <FieldLabel htmlFor={`delivery-medium-${index}`}>
                                        Canal
                                      </FieldLabel>
                                      <Select
                                        items={mediumItems}
                                        value={step.medium}
                                        onValueChange={(medium) => {
                                          if (!medium) return
                                          patchDeliveryStep(
                                            index,
                                            createDeliveryStep(medium, step.action)
                                          )
                                        }}
                                      >
                                        <SelectTrigger
                                          id={`delivery-medium-${index}`}
                                          className="w-full"
                                        >
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItems items={mediumItems} />
                                        </SelectContent>
                                      </Select>
                                    </Field>
                                    <Field>
                                      <FieldLabel htmlFor={`delivery-action-${index}`}>
                                        Action
                                      </FieldLabel>
                                      <Select
                                        items={bulkActionItems}
                                        value={step.action}
                                        onValueChange={(action) =>
                                          action && patchDeliveryStep(index, { ...step, action })
                                        }
                                      >
                                        <SelectTrigger
                                          id={`delivery-action-${index}`}
                                          className="w-full"
                                        >
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItems items={bulkActionItems} />
                                        </SelectContent>
                                      </Select>
                                    </Field>
                                  </div>
                                  {'subject' in step ? (
                                    <Field>
                                      <FieldLabel htmlFor={`delivery-subject-${index}`}>
                                        Objet
                                      </FieldLabel>
                                      <BulkTemplateField
                                        id={`delivery-subject-${index}`}
                                        value={step.subject}
                                        fields={placeholderColumns}
                                        fieldsLoading={placeholderColumnsLoading}
                                        fieldsError={placeholderColumnsError}
                                        multiline={false}
                                        onChange={(subject) => {
                                          const next = { ...step, subject }
                                          const placeholders = collectBulkPlaceholders([
                                            subject,
                                            step.body
                                          ])
                                          patchDeliveryStep(index, {
                                            ...next,
                                            placeholderBindings: bindMatchingPlaceholders(
                                              placeholders,
                                              step.placeholderBindings,
                                              placeholderColumns
                                            )
                                          })
                                        }}
                                      />
                                    </Field>
                                  ) : null}
                                  {'body' in step ? (
                                    <Field>
                                      <FieldLabel htmlFor={`delivery-body-${index}`}>
                                        Message
                                      </FieldLabel>
                                      <BulkTemplateField
                                        id={`delivery-body-${index}`}
                                        value={step.body}
                                        fields={placeholderColumns}
                                        fieldsLoading={placeholderColumnsLoading}
                                        fieldsError={placeholderColumnsError}
                                        onChange={(body) => {
                                          const values =
                                            'subject' in step ? [step.subject, body] : [body]
                                          patchDeliveryStep(index, {
                                            ...step,
                                            body,
                                            placeholderBindings: bindMatchingPlaceholders(
                                              collectBulkPlaceholders(values),
                                              step.placeholderBindings,
                                              placeholderColumns
                                            )
                                          })
                                        }}
                                      />
                                    </Field>
                                  ) : (
                                    <Field>
                                      <FieldLabel htmlFor={`delivery-docx-${index}`}>
                                        Modèle Word
                                      </FieldLabel>
                                      <FieldDescription>
                                        Fichier .docx, 1 Mo maximum, sans boucle ni condition.
                                      </FieldDescription>
                                      <Input
                                        id={`delivery-docx-${index}`}
                                        type="file"
                                        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                        onChange={(event) => {
                                          const file = event.currentTarget.files?.[0]
                                          if (!file) return
                                          void file
                                            .arrayBuffer()
                                            .then((buffer) => inspectBulkDocx(file.name, buffer))
                                            .then(
                                              (upload) =>
                                                patchDeliveryStep(index, {
                                                  ...step,
                                                  ...upload,
                                                  placeholderBindings: reconcilePlaceholderBindings(
                                                    upload.placeholders,
                                                    step.placeholderBindings
                                                  )
                                                }),
                                              (error: unknown) =>
                                                toast.add({
                                                  title:
                                                    error instanceof Error
                                                      ? error.message
                                                      : 'Lecture du fichier Word impossible',
                                                  type: 'error'
                                                })
                                            )
                                        }}
                                      />
                                      {step.filename ? (
                                        <p className="pierre-meta">
                                          <FileUp className="me-1 inline size-4" />
                                          {step.filename} · {step.placeholders.length} placeholder
                                          {step.placeholders.length === 1 ? '' : 's'}
                                        </p>
                                      ) : null}
                                    </Field>
                                  )}
                                  {'fileBase64' in step ? (
                                    <Field>
                                      <FieldLabel htmlFor={`delivery-summary-${index}`}>
                                        Résumé du courrier
                                      </FieldLabel>
                                      <FieldDescription>
                                        Quelques phrases sur ce que dit le courrier. Enregistrées
                                        dans le dossier pour un usage ultérieur, sans s’afficher
                                        dans l’historique.
                                      </FieldDescription>
                                      <Textarea
                                        id={`delivery-summary-${index}`}
                                        rows={3}
                                        maxLength={500}
                                        value={step.summary}
                                        onChange={(event) =>
                                          patchDeliveryStep(index, {
                                            ...step,
                                            summary: event.target.value
                                          })
                                        }
                                      />
                                    </Field>
                                  ) : null}
                                  {'fileBase64' in step ? (
                                    <PlaceholderBindingsEditor
                                      idPrefix={`delivery-${index}`}
                                      placeholders={placeholders}
                                      bindings={step.placeholderBindings}
                                      columnItems={placeholderColumns}
                                      columnsLoading={placeholderColumnsLoading}
                                      columnsError={placeholderColumnsError}
                                      onChange={(placeholderBindings) =>
                                        patchDeliveryStep(index, { ...step, placeholderBindings })
                                      }
                                    />
                                  ) : null}
                                </FieldGroup>
                              </div>
                            )
                          })}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-fit"
                          disabled={fallbackDelivery.steps.length >= BULK_MEDIA.length}
                          onClick={addDeliveryStep}
                        >
                          <Plus data-icon="inline-start" />
                          Ajouter un fallback
                        </Button>
                        <span className="sr-only" aria-live="polite">
                          {planAnnouncement}
                        </span>
                      </Field>
                    ) : richDelivery && RICH_RCS_EDITOR_AVAILABLE ? (
                      <Field>
                        <FieldLabel>Parcours RCS</FieldLabel>
                        <FieldDescription>
                          Les réponses déterminent le message suivant.
                        </FieldDescription>
                        <div className="grid grid-cols-2 gap-2">
                          <Field>
                            <FieldLabel htmlFor="rich-rcs-action">Action</FieldLabel>
                            <Select
                              items={bulkActionItems}
                              value={richDelivery.action}
                              onValueChange={(action) =>
                                action &&
                                patchDefinition({
                                  delivery: { ...richDelivery, action }
                                })
                              }
                            >
                              <SelectTrigger id="rich-rcs-action" className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItems items={bulkActionItems} />
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="rich-rcs-timeout">
                              Délai de réponse (heures)
                            </FieldLabel>
                            <Input
                              id="rich-rcs-timeout"
                              type="number"
                              min={1}
                              max={720}
                              step={1}
                              value={richDelivery.replyTimeoutHours}
                              onChange={(event) =>
                                patchDefinition({
                                  delivery: {
                                    ...richDelivery,
                                    replyTimeoutHours: Number(event.target.value)
                                  }
                                })
                              }
                            />
                          </Field>
                        </div>
                        <div className="flex flex-col gap-2">
                          {richDelivery.nodes.map((node, index) => {
                            const replies = collect_rich_rcs_replies(node.richContent)
                            const laterNodes = richDelivery.nodes.slice(index + 1)
                            const transitionItems = [
                              { value: '__end__', label: 'Terminer le parcours' },
                              ...laterNodes.map((candidate) => ({
                                value: candidate.id,
                                label: candidate.id
                              }))
                            ]
                            return (
                              <div key={node.id} className="rounded-md border p-4">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium">Message {index + 1}</p>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label={`Supprimer le message ${index + 1}`}
                                    disabled={richDelivery.nodes.length === 1}
                                    onClick={() => removeRichNode(index)}
                                  >
                                    <Trash2 />
                                  </Button>
                                </div>
                                <FieldGroup>
                                  <Field>
                                    <FieldLabel htmlFor={`rich-node-id-${index}`}>
                                      Identifiant
                                    </FieldLabel>
                                    <Input
                                      id={`rich-node-id-${index}`}
                                      value={node.id}
                                      pattern="[a-z][a-z0-9_]*"
                                      onChange={(event) => {
                                        const id = event.target.value
                                        const oldId = node.id
                                        if (
                                          richDelivery.nodes.some(
                                            (candidate, candidateIndex) =>
                                              candidateIndex !== index && candidate.id === id
                                          )
                                        ) {
                                          return
                                        }
                                        const nodes = richDelivery.nodes.map(
                                          (candidate, candidateIndex) => ({
                                            ...candidate,
                                            id: candidateIndex === index ? id : candidate.id,
                                            transitions: Object.fromEntries(
                                              Object.entries(candidate.transitions).map(
                                                ([postback, target]) => [
                                                  postback,
                                                  target === oldId ? id : target
                                                ]
                                              )
                                            )
                                          })
                                        ) as [BulkRichRcsNode, ...BulkRichRcsNode[]]
                                        patchDefinition({
                                          delivery: { ...richDelivery, nodes }
                                        })
                                      }}
                                    />
                                  </Field>
                                  <Field>
                                    <FieldLabel htmlFor={`rich-node-body-${index}`}>
                                      Message
                                    </FieldLabel>
                                    <Textarea
                                      id={`rich-node-body-${index}`}
                                      rows={4}
                                      value={node.body}
                                      onChange={(event) =>
                                        patchRichNode(index, {
                                          ...node,
                                          body: event.target.value
                                        })
                                      }
                                    />
                                  </Field>
                                  <JsonObjectField
                                    id={`rich-node-json-${index}`}
                                    value={node.richContent}
                                    onChange={(richContent) => {
                                      const nextReplies = collect_rich_rcs_replies(richContent)
                                      patchRichNode(index, {
                                        ...node,
                                        richContent,
                                        transitions: Object.fromEntries(
                                          nextReplies.map((reply) => [
                                            reply.postbackdata,
                                            node.transitions[reply.postbackdata] ?? null
                                          ])
                                        )
                                      })
                                    }}
                                  />
                                  {replies.map((reply) => (
                                    <Field key={reply.postbackdata}>
                                      <FieldLabel>
                                        Après « {reply.label} » ({reply.postbackdata})
                                      </FieldLabel>
                                      <Select
                                        items={transitionItems}
                                        value={node.transitions[reply.postbackdata] ?? '__end__'}
                                        onValueChange={(target) =>
                                          target &&
                                          patchRichNode(index, {
                                            ...node,
                                            transitions: {
                                              ...node.transitions,
                                              [reply.postbackdata]:
                                                target === '__end__' ? null : target
                                            }
                                          })
                                        }
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItems items={transitionItems} />
                                        </SelectContent>
                                      </Select>
                                    </Field>
                                  ))}
                                </FieldGroup>
                              </div>
                            )
                          })}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-fit"
                          onClick={addRichNode}
                        >
                          <Plus data-icon="inline-start" />
                          Ajouter un message
                        </Button>
                        {rich_rcs_graph_issues(richDelivery.nodes).length > 0 ? (
                          <FieldError>
                            {rich_rcs_graph_issues(richDelivery.nodes).join(' · ')}
                          </FieldError>
                        ) : null}
                        <PlaceholderBindingsEditor
                          idPrefix="rich-rcs"
                          placeholders={collectBulkPlaceholders(
                            richDelivery.nodes.flatMap((node) => [node.body, node.richContent])
                          )}
                          bindings={richDelivery.placeholderBindings}
                          columnItems={placeholderColumns}
                          columnsLoading={placeholderColumnsLoading}
                          columnsError={placeholderColumnsError}
                          onChange={(placeholderBindings) =>
                            patchDefinition({
                              delivery: {
                                ...richDelivery,
                                placeholderBindings
                              }
                            })
                          }
                        />
                      </Field>
                    ) : richDelivery ? (
                      <Empty className="min-h-60">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <CartoonBulkSelectFiles />
                          </EmptyMedia>
                          <EmptyTitle>RCS enrichi bientôt disponible</EmptyTitle>
                          <EmptyDescription>
                            La création de parcours conversationnels sera proposée prochainement.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    ) : null}
                    <Field>
                      <FieldLabel>Panier d’arrivée</FieldLabel>
                      <FieldDescription>
                        Après le premier envoi réussi, ou si vous traitez sans envoyer, le dossier
                        rejoint ce panier.
                      </FieldDescription>
                      <Select
                        items={REPAYMENT_BUCKET_OPTIONS.map((bucket) => ({
                          value: bucket.id,
                          label: bucket.label
                        }))}
                        value={draft.definition.bucketId}
                        onValueChange={(bucketId) => bucketId && patchDefinition({ bucketId })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItems
                            items={REPAYMENT_BUCKET_OPTIONS.map((bucket) => ({
                              value: bucket.id,
                              label: bucket.label
                            }))}
                          />
                        </SelectContent>
                      </Select>
                    </Field>
                  </FieldGroup>
                </FieldSet>
                <FieldSet>
                  <FieldLegend>Audience</FieldLegend>
                  <FieldGroup>
                    <TagSelection
                      label="Paniers"
                      description="Le dossier doit appartenir à l’un des paniers sélectionnés."
                      items={REPAYMENT_BUCKET_OPTIONS.map((bucket) => ({
                        value: bucket.id,
                        label: bucket.label
                      }))}
                      value={draft.definition.requiredBuckets}
                      excluded={[]}
                      onChange={(requiredBuckets) => patchDefinition({ requiredBuckets })}
                    />
                    <TagSelection
                      label="Actions"
                      description="Le dossier doit déjà avoir reçu toutes les actions sélectionnées."
                      items={REPAYMENT_ACTION_OPTIONS.map((action) => ({
                        value: action.id,
                        label: action.label
                      }))}
                      value={draft.definition.requiredActions}
                      excluded={[]}
                      onChange={(requiredActions) => patchDefinition({ requiredActions })}
                    />
                    <TagSelection
                      label="Tags requis"
                      description="Le dossier doit posséder tous les tags sélectionnés."
                      value={draft.definition.requiredTags}
                      excluded={draft.definition.excludedTags}
                      onChange={(requiredTags) => patchDefinition({ requiredTags })}
                    />
                    <TagSelection
                      label="Tags exclus"
                      description="Le dossier ne doit posséder aucun des tags sélectionnés."
                      value={draft.definition.excludedTags}
                      excluded={draft.definition.requiredTags}
                      onChange={(excludedTags) => patchDefinition({ excludedTags })}
                    />
                    <RangeField
                      label="Dette"
                      description="Montant de la dette, de 0 à 25 000 €, bornes comprises."
                      range={draft.definition.amountRange}
                      min={0}
                      max={25000}
                      step={50}
                      unit="€"
                      onCommit={(amountRange) => patchDefinition({ amountRange })}
                    />
                    <RangeField
                      label="Mois d’impayés"
                      description="Nombre de mois d’impayés, de 0 à 24, bornes comprises."
                      range={draft.definition.unpaidMonthsRange}
                      min={0}
                      max={24}
                      step={0.25}
                      unit="mois"
                      onCommit={(unpaidMonthsRange) => patchDefinition({ unpaidMonthsRange })}
                    />
                  </FieldGroup>
                </FieldSet>
              </>
            ) : (
              <Empty className="min-h-60">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CartoonBulkSelectFiles />
                  </EmptyMedia>
                  <EmptyTitle>Source bientôt disponible</EmptyTitle>
                  <EmptyDescription>
                    L’aperçu et l’exécution ne sont pas encore disponibles pour cette source.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </FieldGroup>

          {previewing && !preview ? (
            <p className="pierre-meta mt-8">Chargement de l’aperçu…</p>
          ) : null}
          {preview ? (
            <>
              <p className="pierre-meta mt-8">
                {preview.totals.total} ligne{preview.totals.total === 1 ? '' : 's'} ·{' '}
                {preview.totals.eligible} éligible{preview.totals.eligible === 1 ? '' : 's'} ·{' '}
                {preview.totals.no_usable_route} sans route exploitable
                {channelTotals ? ` · ${channelTotals}` : ''}
                {previewing ? ' · Mise à jour…' : ''}
              </p>
              <div ref={resultsScrollRef} className="mt-4 max-h-[32rem] overflow-auto">
                <table className="w-max min-w-full table-fixed font-sans text-[0.8125rem] leading-5 tabular-nums">
                  <thead className="bg-background text-muted-foreground sticky top-0 z-10 text-[0.6875rem]">
                    <tr className="border-border/60 border-b">
                      <th className="w-28 p-2 text-start font-medium">Locataire</th>
                      <th className="w-28 p-2 text-start font-medium">Dette</th>
                      <th className="w-48 p-2 text-start font-medium">Courriel</th>
                      <th className="w-40 p-2 text-start font-medium">Téléphone</th>
                      <th className="w-36 p-2 text-start font-medium">Canal résolu</th>
                      <th className="w-80 p-2 text-start font-medium">Acheminement</th>
                      <th className="w-16 p-2 text-start font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <VirtualizedTableBody
                    rows={preview.rows}
                    scrollRef={resultsScrollRef}
                    columnCount={7}
                    estimateSize={40}
                    renderRow={(row, { index, measureRef }) => (
                      <TableRow key={row.id_locataire} data-index={index} ref={measureRef}>
                        <TableCell className="whitespace-normal">{row.id_locataire}</TableCell>
                        <TableCell className="whitespace-normal">
                          <PreviewValueCell column="solde_locataire" row={row} />
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <PreviewValueCell column="email_client" row={row} />
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <PreviewValueCell column="telephone_client" row={row} />
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          {row.route
                            ? row.route.kind === 'rich_rcs'
                              ? 'RCS · parcours enrichi'
                              : `${MEDIUM_LABELS[row.route.medium]} · rang ${row.route.stepIndex + 1}`
                            : PREVIEW_STATUS_LABELS.no_usable_route}
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          {row.skippedSteps.length > 0
                            ? row.skippedSteps
                                .map(
                                  (skipped) =>
                                    `${MEDIUM_LABELS[skipped.medium]} : ${skipped.reasons.map(previewStepReasonLabel).join(', ')}`
                                )
                                .join(' · ')
                            : PREVIEW_STATUS_LABELS[row.status]}
                        </TableCell>
                        <TableCell>
                          {draft.definition.delivery.kind === 'rich_rcs' ? (
                            <div className="flex flex-wrap gap-1">
                              {draft.definition.delivery.nodes.map((node, nodeIndex) => (
                                <Button
                                  key={node.id}
                                  type="button"
                                  size="icon-xs"
                                  variant="ghost"
                                  aria-label={`Aperçu du message ${nodeIndex + 1}`}
                                  disabled={row.status !== 'eligible'}
                                  onClick={() => void openMessage(row, node.id)}
                                >
                                  <Eye />
                                </Button>
                              ))}
                            </div>
                          ) : (
                            <Button
                              type="button"
                              size="icon-xs"
                              variant="ghost"
                              aria-label="Aperçu du message"
                              disabled={row.status !== 'eligible'}
                              onClick={() => void openMessage(row)}
                            >
                              <Eye />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  />
                </table>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmApply}
        title="Appliquer le traitement ?"
        description={
          preview
            ? `${concerned} dossier${concerned === 1 ? '' : 's'} concerné${concerned === 1 ? '' : 's'}. Seuls les ${eligible} éligible${eligible === 1 ? '' : 's'} recevront un message.${channelTotals ? ` ${channelTotals}.` : ''}`
            : 'Les destinataires seront prévisualisés avant confirmation.'
        }
        confirmLabel="Appliquer le traitement"
        onConfirm={() => void handleApply(true)}
        onCancel={() => {
          executionCommandId.current = null
          setConfirmApply(false)
        }}
      />
      <ConfirmDialog
        open={confirmApplyWithoutSend}
        title="Traiter sans envoyer ?"
        description={
          preview
            ? `${applyWithoutSendCount} dossier${applyWithoutSendCount === 1 ? '' : 's'} éligible${applyWithoutSendCount === 1 ? '' : 's'}. Aucun message ne sera envoyé. Les activités seront les mêmes qu’après un envoi.${channelTotals ? ` ${channelTotals}.` : ''}`
            : 'Les destinataires seront prévisualisés avant confirmation.'
        }
        confirmLabel="Traiter sans envoyer"
        onConfirm={() => void handleApply(false)}
        onCancel={() => {
          executionCommandId.current = null
          setConfirmApplyWithoutSend(false)
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer ce traitement ?"
        description="Le traitement est retiré définitivement. Les activités déjà écrites sur les locataires restent."
        confirmLabel="Supprimer"
        confirmVariant="destructive"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
      <Dialog
        open={messagePreview !== null}
        onOpenChange={(open) => !open && setMessagePreview(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aperçu du message</DialogTitle>
            <DialogDescription>
              {messagePreview
                ? messagePreview.kind === 'pdf'
                  ? messagePreview.filename
                  : `${MEDIUM_LABELS[messagePreview.medium]}${
                      messagePreview.kind === 'text' && messagePreview.subject
                        ? ` · ${messagePreview.subject}`
                        : messagePreview.kind === 'rich_rcs'
                          ? ` · ${messagePreview.nodeId}`
                          : ''
                    }`
                : null}
            </DialogDescription>
          </DialogHeader>
          {messagePreview ? <BulkMessagePreview preview={messagePreview} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
