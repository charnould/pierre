import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { TicketColumnFilter } from '@/features/tickets/components/TicketColumnFilter'
import { Button } from '@/shared/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/shared/components/ui/select'
import { deskControlVariants } from '@/shared/lib/desk-control'
import { FIELD_CAPTION, FIELD_HEADING, FIELD_HEADING_GROUP } from '@/shared/lib/form-chrome'
import { resolveTicketColumnLabel, type UiSettings } from '@/shared/lib/ui-settings/schema'
import { cn } from '@/shared/lib/utils'
import type { TicketsColumnMeta } from '@/shared/types'

import { useReclamationsColumns } from '../hooks/useReclamationsColumns'
import type { TicketAutomationFilters, TicketFilterRule } from '../lib/automation-types'
import {
  COMPARE_OPERATOR_LABELS,
  partitionFilterRules,
  suggestCompareForColumn
} from '../lib/ticket-filters-client'
import { formatTicketFilters } from './automation-display'

type CompareOperator = TicketFilterRule & { kind: 'compare' } extends { operator: infer O }
  ? O
  : never

interface Props {
  url: string | undefined
  uiSettings?: UiSettings
  value: TicketAutomationFilters
  onChange: (next: TicketAutomationFilters) => void
}

function ruleKey(rule: TicketFilterRule, index: number): string {
  return `${rule.kind}-${rule.column}-${index}`
}

function ValuesRuleEditor({
  url,
  column,
  columnLabel,
  rule,
  onChange,
  onRemove
}: {
  url: string | undefined
  column: string
  columnLabel: string
  rule: Extract<TicketFilterRule, { kind: 'values' }>
  onChange: (values: string[]) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1 space-y-1">
        <p className={cn(FIELD_HEADING, 'text-xs')}>{columnLabel}</p>
        <div className="flex items-center gap-2">
          {url ? (
            <TicketColumnFilter
              url={url}
              column={column}
              columnLabel={columnLabel}
              selected={rule.values}
              onChange={onChange}
            />
          ) : null}
          <span className={cn(FIELD_CAPTION, 'min-w-0 flex-1 truncate')}>
            {rule.values.length === 0 ? 'Aucune valeur sélectionnée' : rule.values.join(', ')}
          </span>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        aria-label="Supprimer"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}

function CompareRuleEditor({
  columnLabel,
  rule,
  onChange,
  onRemove
}: {
  columnLabel: string
  rule: Extract<TicketFilterRule, { kind: 'compare' }>
  onChange: (patch: Partial<Extract<TicketFilterRule, { kind: 'compare' }>>) => void
  onRemove: () => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-0 flex-1 space-y-1">
        <p className={cn(FIELD_HEADING, 'text-xs')}>{columnLabel}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={rule.operator}
            onValueChange={(v) => onChange({ operator: v as CompareOperator })}
          >
            <SelectTrigger variant="desk" className="w-40">
              <span className="flex-1 truncate text-left">
                {COMPARE_OPERATOR_LABELS[rule.operator]}
              </span>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(COMPARE_OPERATOR_LABELS) as CompareOperator[]).map((op) => (
                <SelectItem key={op} value={op}>
                  {COMPARE_OPERATOR_LABELS[op]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            variant="desk"
            className="w-36"
            value={rule.value}
            onChange={(e) => onChange({ value: e.target.value })}
          />
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        aria-label="Supprimer"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}

function OrphanRuleRow({ rule, onRemove }: { rule: TicketFilterRule; onRemove: () => void }) {
  return (
    <div className="border-warning-soft-foreground/25 bg-warning-soft/40 flex items-center justify-between gap-2 rounded-md border px-2.5 py-2">
      <div className="min-w-0 text-xs">
        <span className="text-warning-soft-foreground font-medium">Filtre obsolète</span>
        <span className="text-muted-foreground">
          {' '}
          — colonne « {rule.column} » absente de la table
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        aria-label="Supprimer"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}

export function AutomationTicketFilters({ url, uiSettings, value, onChange }: Props) {
  const { state, reload } = useReclamationsColumns(url)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    void reload()
  }, [reload])

  const columns = state.status === 'ready' ? state.columns : []
  const columnNames = useMemo(() => columns.map((c) => c.name), [columns])
  const columnByName = useMemo(() => new Map(columns.map((c) => [c.name, c])), [columns])

  const { valid, orphaned } = useMemo(
    () => partitionFilterRules(value.rules, columnNames),
    [value.rules, columnNames]
  )

  const usedColumns = useMemo(() => new Set(value.rules.map((r) => r.column)), [value.rules])

  const availableColumns = useMemo(
    () => columns.filter((c) => !usedColumns.has(c.name)),
    [columns, usedColumns]
  )

  const updateRules = useCallback((rules: TicketFilterRule[]) => onChange({ rules }), [onChange])

  const removeRuleAt = (index: number) => {
    updateRules(value.rules.filter((_, i) => i !== index))
  }

  const addRuleForColumn = (column: TicketsColumnMeta) => {
    const rule: TicketFilterRule = suggestCompareForColumn(column)
      ? { kind: 'compare', column: column.name, operator: 'gt', value: '' }
      : { kind: 'values', column: column.name, values: [] }
    updateRules([...value.rules, rule])
  }

  const runPreview = async () => {
    if (!url || !window.api?.getTickets) return
    setPreviewLoading(true)
    setPreviewCount(null)
    try {
      const res = await window.api.getTickets({
        url,
        limit: 1,
        offset: 0,
        filter_rules: valid
      })
      setPreviewCount(res?.meta?.total ?? null)
    } finally {
      setPreviewLoading(false)
    }
  }

  if (!url) {
    return (
      <Field className={FIELD_HEADING_GROUP}>
        <FieldLabel className={FIELD_HEADING}>Filtres réclamations</FieldLabel>
        <FieldDescription className={FIELD_CAPTION}>
          Connectez-vous pour configurer les filtres sur la table réclamations.
        </FieldDescription>
      </Field>
    )
  }

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <Field className={FIELD_HEADING_GROUP}>
        <FieldLabel className={FIELD_HEADING}>Filtres réclamations</FieldLabel>
        <FieldDescription className={FIELD_CAPTION}>Chargement des colonnes…</FieldDescription>
      </Field>
    )
  }

  if (state.status === 'unavailable') {
    return (
      <Field className={FIELD_HEADING_GROUP}>
        <FieldLabel className={FIELD_HEADING}>Filtres réclamations</FieldLabel>
        <FieldDescription className={FIELD_CAPTION}>
          Impossible de lire la table réclamations. Vérifiez la connexion et les données importées.
        </FieldDescription>
        <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
          Réessayer
        </Button>
      </Field>
    )
  }

  return (
    <Field className={cn(FIELD_HEADING_GROUP, 'gap-3')}>
      <div>
        <FieldLabel className={FIELD_HEADING}>Filtres réclamations</FieldLabel>
        <FieldDescription className={FIELD_CAPTION}>
          Colonnes et valeurs lues depuis la table actuelle. Les filtres sur des colonnes supprimées
          sont signalés comme obsolètes.
        </FieldDescription>
      </div>

      {orphaned.length > 0 ? (
        <div className="border-warning-soft-foreground/25 bg-warning-soft/40 text-warning-soft-foreground flex items-start gap-2 rounded-md border px-2.5 py-2 text-xs">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {orphaned.length} filtre{orphaned.length > 1 ? 's' : ''} obsolète
            {orphaned.length > 1 ? 's' : ''} (colonne absente de la table du jour).
          </span>
        </div>
      ) : null}

      <div className="space-y-2.5">
        {value.rules.map((rule, index) => {
          if (!columnByName.has(rule.column)) {
            return (
              <OrphanRuleRow
                key={ruleKey(rule, index)}
                rule={rule}
                onRemove={() => removeRuleAt(index)}
              />
            )
          }
          const label = resolveTicketColumnLabel(rule.column, uiSettings)
          if (rule.kind === 'compare') {
            return (
              <div
                key={ruleKey(rule, index)}
                className={cn('rounded-md border p-2.5', deskControlVariants({ variant: 'desk' }))}
              >
                <CompareRuleEditor
                  columnLabel={label}
                  rule={rule}
                  onChange={(patch) => {
                    const next = [...value.rules]
                    next[index] = { ...rule, ...patch }
                    updateRules(next)
                  }}
                  onRemove={() => removeRuleAt(index)}
                />
              </div>
            )
          }
          return (
            <div
              key={ruleKey(rule, index)}
              className={cn('rounded-md border p-2.5', deskControlVariants({ variant: 'desk' }))}
            >
              <ValuesRuleEditor
                url={url}
                column={rule.column}
                columnLabel={label}
                rule={rule}
                onChange={(values) => {
                  const next = [...value.rules]
                  next[index] = { ...rule, values }
                  updateRules(next)
                }}
                onRemove={() => removeRuleAt(index)}
              />
            </div>
          )
        })}
      </div>

      {availableColumns.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value=""
            onValueChange={(name) => {
              const col = columnByName.get(name)
              if (col) addRuleForColumn(col)
            }}
          >
            <SelectTrigger variant="desk" className="w-56">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Plus className="size-3.5" />
                Ajouter un filtre
              </span>
            </SelectTrigger>
            <SelectContent>
              {availableColumns.map((col) => (
                <SelectItem key={col.name} value={col.name}>
                  {resolveTicketColumnLabel(col.name, uiSettings)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : value.rules.length === 0 ? (
        <p className={FIELD_CAPTION}>Aucune colonne disponible dans la table réclamations.</p>
      ) : null}

      {value.rules.length > 0 ? (
        <p className={cn(FIELD_CAPTION, 'text-balance')}>
          Résumé : {formatTicketFilters(value, uiSettings)}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={valid.length === 0 || previewLoading}
          onClick={() => void runPreview()}
        >
          {previewLoading ? 'Aperçu…' : 'Aperçu'}
        </Button>
        {previewCount !== null ? (
          <span className={FIELD_CAPTION}>
            {previewCount} réclamation{previewCount > 1 ? 's' : ''} éligible
            {previewCount > 1 ? 's' : ''}
            {orphaned.length > 0 ? ' (filtres obsolètes exclus)' : ''}
          </span>
        ) : null}
      </div>
    </Field>
  )
}
