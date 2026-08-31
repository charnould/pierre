import { Trash2 } from 'lucide-react'
import { useId } from 'react'

import { SelectItems } from '@/shared/components/SelectItems'
import { Button } from '@/shared/components/ui/button'
import { Field, FieldLabel } from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/shared/components/ui/select'

import { sortSelectOptions } from '../../lib/apurement-plan/sort-select-options'
import { AID_PRESETS, type AidItem } from '../../lib/apurement-plan/types'

const TYPE_OTHER = '__other__'

const AID_ITEMS = [
  { label: "Type d'aide", value: null },
  ...sortSelectOptions(AID_PRESETS).map((preset) => ({ label: preset, value: preset })),
  { label: 'Autre…', value: TYPE_OTHER }
]

function AidRow({
  item,
  canRemove,
  showLabels,
  onChange,
  onRemove
}: {
  item: AidItem
  canRemove: boolean
  showLabels: boolean
  onChange: (patch: Partial<AidItem>) => void
  onRemove: () => void
}) {
  const typeId = useId()

  const typeControl = item.custom ? (
    <Input
      id={typeId}
      aria-label="Type d'aide"
      placeholder="Libellé de l'aide"
      value={item.label}
      onChange={(e) => onChange({ label: e.target.value })}
    />
  ) : (
    <Select
      items={AID_ITEMS}
      value={item.label || null}
      onValueChange={(value) => {
        if (value == null) return
        if (value === TYPE_OTHER) {
          onChange({ label: '', custom: true })
          return
        }
        onChange({ label: String(value), custom: false })
      }}
    >
      <SelectTrigger id={typeId} size="sm" aria-label={showLabels ? undefined : "Type d'aide"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start">
        <SelectItems items={AID_ITEMS} />
      </SelectContent>
    </Select>
  )

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field className="w-auto min-w-40 flex-1">
        {showLabels ? <FieldLabel htmlFor={typeId}>Type d’aide</FieldLabel> : null}
        {typeControl}
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
  items: AidItem[]
  onChange: (items: AidItem[]) => void
}

export function AidList({ items, onChange }: Props) {
  const updateItem = (id: string, patch: Partial<AidItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, index) => (
        <AidRow
          key={item.id}
          item={item}
          canRemove={items.length > 1}
          showLabels={index === 0}
          onChange={(patch) => updateItem(item.id, patch)}
          onRemove={() => onChange(items.filter((entry) => entry.id !== item.id))}
        />
      ))}
    </div>
  )
}
