import { Trash2 } from 'lucide-react'
import { useId, useMemo } from 'react'

import { SelectItems, type SelectOption } from '@/shared/components/SelectItems'
import { Button } from '@/shared/components/ui/button'
import { Field, FieldLabel } from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select'

import type { HouseholdPersonOption } from '../../lib/apurement-plan/household'
import { sortSelectOptions } from '../../lib/apurement-plan/sort-select-options'
import { CREDIT_EXPENSE_PRESET, type AmountLine } from '../../lib/apurement-plan/types'
import { MoneyInput } from './MoneyInput'
import { MonthInput } from './MonthInput'

const TYPE_OTHER = '__other__'

type PresetGroup = { label: string; presets: readonly string[] }

function isPresetGroups(
  presets: readonly string[] | readonly PresetGroup[]
): presets is readonly PresetGroup[] {
  return typeof presets[0] === 'object'
}

function AmountLineRow({
  item,
  typeItems,
  groups,
  typeLabel,
  customPlaceholder,
  personItems,
  canRemove,
  reserveRemoveSlot,
  locked,
  showLabels,
  showMonth,
  onChange,
  onRemove
}: {
  item: AmountLine
  typeItems: SelectOption[]
  groups: readonly PresetGroup[] | null
  typeLabel: string
  customPlaceholder: string
  personItems: SelectOption[] | null
  canRemove: boolean
  reserveRemoveSlot: boolean
  locked: boolean
  showLabels: boolean
  showMonth: boolean
  onChange: (patch: Partial<AmountLine>) => void
  onRemove: () => void
}) {
  const typeId = useId()
  const personId = useId()
  const endMonthId = useId()
  const monthId = useId()
  const amountId = useId()

  const typeControl = locked ? (
    <Input
      id={typeId}
      aria-label={showLabels ? undefined : typeLabel}
      value={item.label}
      disabled
    />
  ) : item.custom ? (
    <Input
      id={typeId}
      aria-label={typeLabel}
      placeholder={customPlaceholder}
      value={item.label}
      onChange={(e) => onChange({ label: e.target.value, endMonth: '' })}
    />
  ) : (
    <Select
      items={typeItems}
      value={item.label || null}
      onValueChange={(value) => {
        if (value === TYPE_OTHER) {
          onChange({ label: '', custom: true, endMonth: '' })
          return
        }
        const label = String(value)
        onChange({
          label,
          custom: false,
          ...(label === CREDIT_EXPENSE_PRESET ? {} : { endMonth: '' })
        })
      }}
    >
      <SelectTrigger id={typeId} size="sm" aria-label={showLabels ? undefined : typeLabel}>
        <SelectValue placeholder={typeLabel} />
      </SelectTrigger>
      <SelectContent align="start">
        {groups ? (
          <>
            {groups.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.presets.map((preset) => (
                  <SelectItem key={preset} value={preset}>
                    {preset}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
            <SelectGroup>
              <SelectItem value={TYPE_OTHER}>Autre…</SelectItem>
            </SelectGroup>
          </>
        ) : (
          <SelectItems items={typeItems} />
        )}
      </SelectContent>
    </Select>
  )

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field className="w-auto min-w-40 flex-1">
        {showLabels ? <FieldLabel htmlFor={typeId}>{typeLabel}</FieldLabel> : null}
        {typeControl}
      </Field>
      {personItems ? (
        <Field className="w-auto min-w-36 flex-1">
          {showLabels ? <FieldLabel htmlFor={personId}>Personne</FieldLabel> : null}
          <Select
            items={personItems}
            value={item.personId ?? null}
            onValueChange={(value) => onChange({ personId: value == null ? null : String(value) })}
          >
            <SelectTrigger id={personId} size="sm" aria-label={showLabels ? undefined : 'Personne'}>
              <SelectValue placeholder="Personne" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItems items={personItems} />
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      {showMonth ? (
        <Field className="w-32">
          {showLabels ? <FieldLabel htmlFor={monthId}>Mois</FieldLabel> : null}
          <MonthInput
            id={monthId}
            aria-label={showLabels ? undefined : 'Mois'}
            className="w-full"
            value={item.month}
            onChange={(month) => onChange({ month })}
          />
        </Field>
      ) : null}
      {item.label === CREDIT_EXPENSE_PRESET && !showMonth ? (
        <Field className="w-28">
          {showLabels ? <FieldLabel htmlFor={endMonthId}>fin</FieldLabel> : null}
          <MonthInput
            id={endMonthId}
            aria-label={showLabels ? undefined : 'fin'}
            placeholder="fin"
            className="w-full"
            value={item.endMonth.slice(0, 7)}
            onChange={(endMonth) => onChange({ endMonth })}
          />
        </Field>
      ) : null}
      <Field className="w-36">
        {showLabels ? <FieldLabel htmlFor={amountId}>Montant</FieldLabel> : null}
        <MoneyInput
          id={amountId}
          aria-label={showLabels ? undefined : 'Montant'}
          value={item.amount}
          onChange={(amount) => onChange({ amount })}
        />
      </Field>
      {canRemove ? (
        <Button type="button" variant="ghost" size="icon" aria-label="Retirer" onClick={onRemove}>
          <Trash2 />
        </Button>
      ) : reserveRemoveSlot ? (
        <span className="size-8" aria-hidden />
      ) : null}
    </div>
  )
}

interface Props {
  items: AmountLine[]
  presets: readonly string[] | readonly PresetGroup[]
  placeholderLabel: string
  customPlaceholder: string
  people?: HouseholdPersonOption[]
  /** Libellé de preset qui ne peut ni être retiré ni être retypé. */
  lockedLabel?: string
  /** Affiche le mois `MM/AAAA` et autorise de retirer la dernière ligne. */
  showMonth?: boolean
  onChange: (items: AmountLine[]) => void
}

export function AmountLineList({
  items,
  presets,
  placeholderLabel,
  customPlaceholder,
  people,
  lockedLabel,
  showMonth = false,
  onChange
}: Props) {
  const groups = isPresetGroups(presets) ? presets : null
  const typeItems = useMemo<SelectOption[]>(() => {
    const labels = isPresetGroups(presets)
      ? presets.flatMap((group) => group.presets)
      : sortSelectOptions(presets)
    return [
      ...labels.map((preset) => ({ label: preset, value: preset })),
      { label: 'Autre…', value: TYPE_OTHER }
    ]
  }, [presets])

  const personItems = useMemo<SelectOption[] | null>(
    () =>
      people
        ? [
            { label: 'Foyer (non assigné)', value: null },
            ...people.map((person) => ({ label: person.label, value: person.id }))
          ]
        : null,
    [people]
  )

  const updateItem = (id: string, patch: Partial<AmountLine>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removable = showMonth || items.length > 1

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, index) => {
        const locked = Boolean(lockedLabel) && !item.custom && item.label === lockedLabel
        return (
          <AmountLineRow
            key={item.id}
            item={item}
            typeItems={typeItems}
            groups={groups}
            typeLabel={placeholderLabel}
            customPlaceholder={customPlaceholder}
            personItems={personItems}
            canRemove={!locked && removable}
            reserveRemoveSlot={locked && removable}
            locked={locked}
            showLabels={index === 0}
            showMonth={showMonth}
            onChange={(patch) => updateItem(item.id, patch)}
            onRemove={() => onChange(items.filter((entry) => entry.id !== item.id))}
          />
        )
      })}
    </div>
  )
}
