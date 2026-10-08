import { cn } from 'cn'
import { Plus, Trash2 } from 'lucide-react'
import { type ChangeEvent, type ReactNode, useState } from 'react'
import { fr } from 'react-day-picker/locale'

import { Button } from '@/shared/components/ui/button'
import { Calendar } from '@/shared/components/ui/calendar'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor
} from '@/shared/components/ui/combobox'
import { parseLocalIsoDate, toLocalIsoDate } from '@/shared/components/ui/date-picker'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from '@/shared/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/shared/components/ui/input-group'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select'
import { Switch } from '@/shared/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

const euros = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const frenchDate = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

export function textField(value: string | null, onChange: (value: string | null) => void) {
  return {
    value: value ?? '',
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(event.target.value === '' ? null : event.target.value)
    }
  }
}

function useNumberDraft(
  value: number | null,
  onChange: (value: number | null) => void,
  parse: (text: string) => number | null,
  display: (value: number) => string
) {
  const [draft, setDraft] = useState<string | null>(null)
  return {
    text: draft ?? (value == null ? '' : display(value)),
    change: (text: string) => {
      setDraft(text)
      onChange(parse(text))
    },
    commit: () => setDraft(null)
  }
}

function parseEuros(text: string, signed = false): number | null {
  const cleaned = text.replace(/\s/g, '').replace(',', '.')
  if (cleaned === '' || cleaned === '.' || cleaned === '-' || cleaned === '-.') return null
  if (!(signed ? /^-?\d+\.?\d*$/ : /^\d+\.?\d*$/).test(cleaned)) return null
  const amount = Number(cleaned)
  return Number.isFinite(amount) ? amount : null
}

export function Section({
  id,
  title,
  action,
  children
}: {
  id: string
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id}>
      <Card>
        <CardHeader>
          <CardTitle id={id}>{title}</CardTitle>
          {action ? <CardAction>{action}</CardAction> : null}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">{children}</div>
        </CardContent>
      </Card>
    </section>
  )
}

export function Rows({ children }: { children: ReactNode }) {
  return <FieldGroup variant="rows">{children}</FieldGroup>
}

export function Row({
  title,
  description,
  htmlFor,
  titleId,
  wide = false,
  children
}: {
  title?: string
  description?: string
  htmlFor?: string
  titleId?: string
  wide?: boolean
  children: ReactNode
}) {
  return (
    <Field orientation={wide ? 'wide' : 'horizontal'}>
      <FieldContent>
        {title ? (
          <FieldLabel htmlFor={htmlFor} id={titleId}>
            {title}
          </FieldLabel>
        ) : null}
        {description ? <FieldDescription>{description}</FieldDescription> : null}
      </FieldContent>
      {children}
    </Field>
  )
}

export function DateField({
  id,
  value,
  onChange,
  empty = 'JJ/MM/AAAA',
  label,
  className,
  captionLayout = 'label'
}: {
  id?: string
  value: string | null
  onChange: (value: string | null) => void
  empty?: string
  label?: string
  className?: string
  captionLayout?: 'label' | 'dropdown'
}) {
  const [year] = useState(() => new Date().getFullYear())
  const dropdown = captionLayout === 'dropdown'
  const selected = value ? parseLocalIsoDate(value) : undefined
  return (
    <Popover>
      <PopoverTrigger
        id={id}
        render={
          <Button
            variant="outline"
            aria-label={label}
            className={cn('w-full justify-start', className)}
          />
        }
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected ? frenchDate.format(selected) : empty}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          locale={fr}
          mode="single"
          captionLayout={captionLayout}
          reverseYears={dropdown ? true : undefined}
          startMonth={dropdown ? new Date(year - 100, 0) : undefined}
          endMonth={dropdown ? new Date(year + 10, 11) : undefined}
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => onChange(date ? toLocalIsoDate(date) : null)}
        />
      </PopoverContent>
    </Popover>
  )
}

export function Euros({
  id,
  label,
  value,
  signed = false,
  onChange
}: {
  id?: string
  label?: string
  value: number | null
  signed?: boolean
  onChange: (value: number | null) => void
}) {
  const draft = useNumberDraft(
    value,
    onChange,
    (text) => parseEuros(text, signed),
    (amount) => euros.format(amount)
  )
  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        placeholder="0,00"
        inputMode="decimal"
        aria-label={label}
        value={draft.text}
        onChange={(event) => draft.change(event.target.value)}
        onBlur={draft.commit}
      />
      <InputGroupAddon align="inline-end">€</InputGroupAddon>
    </InputGroup>
  )
}

type Choice = string | readonly [string, ...string[]]

function labelOf(option: Choice) {
  return typeof option === 'string' ? option : option[0]
}

export function PairSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder = 'Choisir',
  className,
  ariaLabel
}: {
  id: string
  value: string | null
  onValueChange: (value: string | null) => void
  options: readonly Choice[]
  placeholder?: string
  className?: string
  ariaLabel?: string
}) {
  const labels = options.map(labelOf)
  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange(typeof next === 'string' ? next : null)}
      items={Object.fromEntries(labels.map((item) => [item, item]))}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className={cn('w-full', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {labels.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export function CodeSelect<T extends string>({
  id,
  label,
  value,
  onValueChange,
  options
}: {
  id?: string
  label: string
  value: T | null
  onValueChange: (value: T | null) => void
  options: readonly (readonly [T, string] | readonly [T, string, string])[]
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange(typeof next === 'string' ? (next as T) : null)}
      items={Object.fromEntries(options.map(([code, text]) => [code, text]))}
    >
      <SelectTrigger id={id} aria-label={label} className="w-full">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="w-max">
        <SelectGroup>
          {options.map(([code, text, detail]) => (
            <SelectItem key={code} value={code} description={detail}>
              {text}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export function SimpleSelect({
  id,
  label,
  value,
  onValueChange,
  options
}: {
  id?: string
  label: string
  value: string | null
  onValueChange: (value: string | null) => void
  options: readonly Choice[]
}) {
  const rows = options.map((option) => (typeof option === 'string' ? ([option] as const) : option))
  const described = rows.some(([, detail]) => Boolean(detail))
  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange(typeof next === 'string' ? next : null)}
      items={Object.fromEntries(rows.map(([item]) => [item, item]))}
    >
      <SelectTrigger id={id} aria-label={label} className="w-full">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className={described ? 'w-96' : 'w-max'}>
        <SelectGroup>
          {rows.map(([item, detail]) => (
            <SelectItem key={item} value={item} description={detail}>
              {item}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export function YesNo({
  id,
  title,
  description,
  checked,
  controls,
  onCheckedChange
}: {
  id: string
  title: string
  description: string
  checked: boolean
  controls?: string
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <Row wide title={title} description={description} htmlFor={id}>
      <Switch
        id={id}
        checked={checked}
        aria-controls={controls}
        aria-expanded={controls ? checked : undefined}
        onCheckedChange={(next) => onCheckedChange(next === true)}
      />
    </Row>
  )
}

export function Detail({
  id,
  label,
  children
}: {
  id: string
  label: string
  children: ReactNode
}) {
  return (
    <FieldGroup id={id} role="group" aria-label={label} variant="detail" data-conditional-detail>
      {children}
    </FieldGroup>
  )
}

export function Chips({
  labelledBy,
  ariaLabel,
  placeholder,
  empty,
  items,
  value,
  onValueChange,
  query,
  onQueryChange,
  label = (item) => item,
  itemLabel
}: {
  labelledBy?: string
  ariaLabel?: string
  placeholder: string
  empty: string
  items: readonly string[]
  value: readonly string[]
  onValueChange: (value: string[]) => void
  query: string
  onQueryChange: (query: string) => void
  label?: (item: string) => string
  itemLabel?: (item: string) => string
}) {
  const anchor = useComboboxAnchor()
  const optionLabel = itemLabel ?? label

  return (
    <Combobox
      multiple
      items={[...items]}
      value={[...value]}
      inputValue={query}
      onInputValueChange={onQueryChange}
      onValueChange={(next) => {
        onValueChange([...next])
        onQueryChange('')
      }}
    >
      <ComboboxChips ref={anchor}>
        <ComboboxValue>
          {(selected: string[]) => (
            <>
              {selected.map((item) => (
                <ComboboxChip key={item}>{label(item)}</ComboboxChip>
              ))}
              <ComboboxChipsInput
                aria-labelledby={labelledBy}
                aria-label={ariaLabel}
                placeholder={selected.length ? '' : placeholder}
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>{empty}</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {optionLabel(item)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

export function CreatableChips({
  labelledBy,
  ariaLabel,
  placeholder,
  empty,
  suggestions,
  value,
  onValueChange
}: {
  labelledBy?: string
  ariaLabel?: string
  placeholder: string
  empty: string
  suggestions: readonly string[]
  value: readonly string[]
  onValueChange: (value: string[]) => void
}) {
  const [catalog, setCatalog] = useState<string[]>([...suggestions])
  const [query, setQuery] = useState('')
  const typed = query.trim()
  const known = catalog.some((item) => item.toLocaleLowerCase() === typed.toLocaleLowerCase())
  const items = typed && !known ? [...catalog, typed] : catalog

  return (
    <Chips
      labelledBy={labelledBy}
      ariaLabel={ariaLabel}
      placeholder={placeholder}
      empty={empty}
      items={items}
      value={value}
      query={query}
      onQueryChange={setQuery}
      itemLabel={(item) => (catalog.includes(item) ? item : `Ajouter « ${item} »`)}
      onValueChange={(next) => {
        setCatalog((current) => {
          const extra = next.filter(
            (item) =>
              !current.some((known) => known.toLocaleLowerCase() === item.toLocaleLowerCase())
          )
          return extra.length ? [...current, ...extra] : current
        })
        onValueChange(next)
      }}
    />
  )
}

export function RemoveButton({
  label,
  onClick,
  disabled = false
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
          />
        }
      >
        <Trash2 />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function AddButton({
  children,
  className,
  disabled,
  onClick
}: {
  children: string
  className?: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn('w-fit', className)}
      disabled={disabled}
      onClick={onClick}
    >
      <Plus data-icon="inline-start" />
      {children}
    </Button>
  )
}

export function AddRow({
  title,
  description,
  action = 'Ajouter',
  onAdd,
  children
}: {
  title: string
  description: string
  action?: string
  onAdd: () => void
  children: ReactNode
}) {
  return (
    <FieldSet>
      <FieldLegend variant="label">{title}</FieldLegend>
      <FieldDescription>{description}</FieldDescription>
      {children}
      <AddButton className="ms-2" onClick={onAdd}>
        {action}
      </AddButton>
    </FieldSet>
  )
}
