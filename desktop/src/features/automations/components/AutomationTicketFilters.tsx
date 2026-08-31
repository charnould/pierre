import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { TicketColumnFilter } from '@/features/tickets/components/TicketColumnFilter'
import { SelectItems } from '@/shared/components/SelectItems'
import { Button } from '@/shared/components/ui/button'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLegend,
  FieldSet,
  FieldTitle
} from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle
} from '@/shared/components/ui/item'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { resolveTicketColumnLabel, type UiSettings } from '@/shared/lib/ui-settings/schema'
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

const COMPARE_OPERATOR_ITEMS = (Object.keys(COMPARE_OPERATOR_LABELS) as CompareOperator[]).map(
  (value) => ({ label: COMPARE_OPERATOR_LABELS[value], value })
)

/** Stable identity, so the memos below do not recompute on every loading render. */
const NO_COLUMNS: TicketsColumnMeta[] = []

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
    <Field orientation="horizontal">
      <FieldContent>
        <FieldTitle>{columnLabel}</FieldTitle>
        <div className="flex items-center gap-2">
          {url ? (
            <TicketColumnFilter
              url={url}
              columnName={column}
              columnLabel={columnLabel}
              selected={rule.values}
              onChange={onChange}
            />
          ) : null}
          <FieldDescription className="min-w-0 flex-1 truncate">
            {rule.values.length === 0 ? 'Aucune valeur sélectionnée' : rule.values.join(', ')}
          </FieldDescription>
        </div>
      </FieldContent>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        aria-label="Supprimer"
      >
        <Trash2 />
      </Button>
    </Field>
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
    <Field orientation="horizontal">
      <FieldContent>
        <FieldTitle>{columnLabel}</FieldTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            items={COMPARE_OPERATOR_ITEMS}
            value={rule.operator}
            onValueChange={(v) => onChange({ operator: v as CompareOperator })}
          >
            <SelectTrigger aria-label="Opérateur" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItems items={COMPARE_OPERATOR_ITEMS} />
            </SelectContent>
          </Select>
          <Input
            type="date"
            aria-label="Date"
            value={rule.value}
            onChange={(e) => onChange({ value: e.target.value })}
          />
        </div>
      </FieldContent>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        aria-label="Supprimer"
      >
        <Trash2 />
      </Button>
    </Field>
  )
}

function OrphanRuleRow({ rule, onRemove }: { rule: TicketFilterRule; onRemove: () => void }) {
  return (
    <Item variant="muted" size="sm">
      <ItemContent>
        <ItemTitle>Filtre obsolète</ItemTitle>
        <ItemDescription>colonne « {rule.column} » absente de la table</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          aria-label="Supprimer"
        >
          <Trash2 />
        </Button>
      </ItemActions>
    </Item>
  )
}

export function AutomationTicketFilters({ url, uiSettings, value, onChange }: Props) {
  const { state, reload } = useReclamationsColumns(url)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    void reload()
  }, [reload])

  const columns = state.status === 'ready' ? state.columns : NO_COLUMNS
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

  const addFilterItems = useMemo(
    () =>
      availableColumns.map((col) => ({
        label: resolveTicketColumnLabel(col.name, uiSettings),
        value: col.name
      })),
    [availableColumns, uiSettings]
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
      <FieldSet>
        <FieldLegend variant="label">Filtres réclamations</FieldLegend>
        <FieldDescription>
          Connectez-vous pour configurer les filtres sur la table réclamations.
        </FieldDescription>
      </FieldSet>
    )
  }

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <FieldSet>
        <FieldLegend variant="label">Filtres réclamations</FieldLegend>
        <FieldDescription>Chargement des colonnes…</FieldDescription>
      </FieldSet>
    )
  }

  if (state.status === 'unavailable') {
    return (
      <FieldSet>
        <FieldLegend variant="label">Filtres réclamations</FieldLegend>
        <FieldDescription>
          Impossible de lire la table réclamations. Vérifiez la connexion et les données importées.
        </FieldDescription>
        <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
          Réessayer
        </Button>
      </FieldSet>
    )
  }

  return (
    <FieldSet>
      <FieldLegend variant="label">Filtres réclamations</FieldLegend>
      <FieldDescription>
        Colonnes et valeurs lues depuis la table actuelle. Seules les réclamations correspondant à
        tous les filtres sont traitées. Les filtres sur des colonnes supprimées sont signalés comme
        obsolètes.
      </FieldDescription>

      {orphaned.length > 0 ? (
        <Item variant="muted" size="sm">
          <ItemMedia variant="icon">
            <AlertTriangle />
          </ItemMedia>
          <ItemContent>
            <ItemDescription>
              {orphaned.length} filtre{orphaned.length > 1 ? 's' : ''} obsolète
              {orphaned.length > 1 ? 's' : ''} (colonne absente de la table du jour).
            </ItemDescription>
          </ItemContent>
        </Item>
      ) : null}

      <div className="flex flex-col gap-3">
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
              <CompareRuleEditor
                key={ruleKey(rule, index)}
                columnLabel={label}
                rule={rule}
                onChange={(patch) => {
                  const next = [...value.rules]
                  next[index] = { ...rule, ...patch }
                  updateRules(next)
                }}
                onRemove={() => removeRuleAt(index)}
              />
            )
          }
          return (
            <ValuesRuleEditor
              key={ruleKey(rule, index)}
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
          )
        })}
      </div>

      {availableColumns.length > 0 ? (
        <Select
          items={addFilterItems}
          value={null}
          onValueChange={(name) => {
            if (typeof name !== 'string') return
            const col = columnByName.get(name)
            if (col) addRuleForColumn(col)
          }}
        >
          <SelectTrigger aria-label="Ajouter un filtre" className="w-56">
            <Plus data-icon="inline-start" />
            <SelectValue placeholder="Ajouter un filtre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItems items={addFilterItems} />
          </SelectContent>
        </Select>
      ) : value.rules.length === 0 ? (
        <FieldDescription>Aucune colonne disponible dans la table réclamations.</FieldDescription>
      ) : null}

      {value.rules.length > 0 ? (
        <FieldDescription>Résumé : {formatTicketFilters(value, uiSettings)}</FieldDescription>
      ) : null}

      <Field orientation="horizontal">
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
          <FieldDescription>
            {previewCount} réclamation{previewCount > 1 ? 's' : ''} éligible
            {previewCount > 1 ? 's' : ''}
            {orphaned.length > 0 ? ' (filtres obsolètes exclus)' : ''}
          </FieldDescription>
        ) : null}
      </Field>
    </FieldSet>
  )
}
