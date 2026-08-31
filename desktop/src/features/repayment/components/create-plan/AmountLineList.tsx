import { Trash2 } from 'lucide-react'
import { useId, useMemo } from 'react'

import { SelectItems, type SelectOption } from '@/shared/components/SelectItems'
import { Button } from '@/shared/components/ui/button'
import { Field, FieldLabel } from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/shared/components/ui/select'

import type { HouseholdPersonOption } from '../../lib/apurement-plan/household'
import { sortSelectOptions } from '../../lib/apurement-plan/sort-select-options'
import type { AmountLine } from '../../lib/apurement-plan/types'
import { MoneyInput } from './MoneyInput'

const TYPE_OTHER = '__other__'

function AmountLineRow({
  item,
  typeItems,
  typeLabel,
  customPlaceholder,
  personItems,
  canRemove,
  showLabels,
  onChange,
  onRemove
}: {
  item: AmountLine
  typeItems: SelectOption[]
  typeLabel: string
  customPlaceholder: string
  personItems: SelectOption[] | null
  canRemove: boolean
  showLabels: boolean
  onChange: (patch: Partial<AmountLine>) => void
  onRemove: () => void
}) {
  const typeId = useId()
  const personId = useId()
  const amountId = useId()

  const typeControl = item.custom ? (
    <Input
      id={typeId}
      aria-label={typeLabel}
      placeholder={customPlaceholder}
      value={item.label}
      onChange={(e) => onChange({ label: e.target.value })}
    />
  ) : (
    <Select
      items={typeItems}
      value={item.label || null}
      onValueChange={(value) => {
        if (value === TYPE_OTHER) {
          onChange({ label: '', custom: true })
          return
        }
        onChange({ label: String(value), custom: false })
      }}
    >
      <SelectTrigger id={typeId} size="sm" aria-label={showLabels ? undefined : typeLabel}>
        <SelectValue placeholder={typeLabel} />
      </SelectTrigger>
      <SelectContent align="start">
        <SelectItems items={typeItems} />
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
      ) : null}
    </div>
  )
}

interface Props {
  items: AmountLine[]
  presets: readonly string[]
  placeholderLabel: string
  customPlaceholder: string
  people?: HouseholdPersonOption[]
  onChange: (items: AmountLine[]) => void
}

export function AmountLineList({
  items,
  presets,
  placeholderLabel,
  customPlaceholder,
  people,
  onChange
}: Props) {
  const typeItems = useMemo<SelectOption[]>(
    () => [
      ...sortSelectOptions(presets).map((preset) => ({ label: preset, value: preset })),
      { label: 'Autre…', value: TYPE_OTHER }
    ],
    [presets]
  )

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

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, index) => (
        <AmountLineRow
          key={item.id}
          item={item}
          typeItems={typeItems}
          typeLabel={placeholderLabel}
          customPlaceholder={customPlaceholder}
          personItems={personItems}
          canRemove={items.length > 1}
          showLabels={index === 0}
          onChange={(patch) => updateItem(item.id, patch)}
          onRemove={() => onChange(items.filter((entry) => entry.id !== item.id))}
        />
      ))}
    </div>
  )
}
