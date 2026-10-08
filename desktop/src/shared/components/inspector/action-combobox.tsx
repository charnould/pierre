import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from '@/shared/components/ui/combobox'

export function ActionCombobox({
  id,
  value,
  items,
  onValueChange,
  disabled = false,
  placeholder = 'Choisir une action…',
  ariaLabel = 'Action',
  className = 'w-full'
}: {
  id?: string
  value: string
  items: readonly string[]
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  ariaLabel?: string
  className?: string
}) {
  return (
    <Combobox
      autoHighlight
      items={items}
      value={items.includes(value) ? value : null}
      inputValue={value}
      onValueChange={(next) => onValueChange(typeof next === 'string' ? next : '')}
      onInputValueChange={onValueChange}
    >
      <ComboboxInput
        id={id}
        className={className}
        placeholder={placeholder}
        showClear
        disabled={disabled}
        aria-label={ariaLabel}
      />
      <ComboboxContent>
        <ComboboxEmpty>Aucune action</ComboboxEmpty>
        <ComboboxList>
          {(label) => (
            <ComboboxItem key={label} value={label}>
              {label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
