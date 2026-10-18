import { Input as InputPrimitive } from '@base-ui/react/input'
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { Select as SelectPrimitive } from '@base-ui/react/select'
import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon
} from 'lucide-react'
import { useState } from 'react'
import type { ComponentProps } from 'react'
import { DayPicker, getDefaultClassNames, type DayButton } from 'react-day-picker'
import { fr } from 'react-day-picker/locale'
import { twMerge } from 'tailwind-merge'

function cn(...parts: Array<unknown>) {
  return twMerge(
    parts.filter((part): part is string => typeof part === 'string' && part.length > 0).join(' ')
  )
}

const control =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-field px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground hover:bg-field-hover focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25'

function Field({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2', className)} {...props} />
}

function FieldLabel({ className, ...props }: ComponentProps<'label'>) {
  return (
    <label
      className={cn('text-sm leading-snug font-medium text-foreground', className)}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      className={cn('text-xs leading-4 font-normal text-pretty text-muted-foreground', className)}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-4', className)} {...props} />
}

function FieldSet({ className, ...props }: ComponentProps<'fieldset'>) {
  return (
    <fieldset
      className={cn('m-0 flex min-w-0 flex-col gap-4 border-0 p-0', className)}
      {...props}
    />
  )
}

function FieldLegend({ className, ...props }: ComponentProps<'legend'>) {
  return (
    <legend
      className={cn(
        'mb-6 block w-full p-0 font-serif text-3xl leading-9 font-semibold tracking-tight',
        className
      )}
      {...props}
    />
  )
}

function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('text-sm leading-none font-medium', className)} {...props} />
}

function Input({ className, ...props }: ComponentProps<typeof InputPrimitive>) {
  return <InputPrimitive className={cn(control, className)} {...props} />
}

function InputGroup({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex h-8 items-center rounded-lg border border-input bg-field hover:bg-field-hover focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25',
        className
      )}
      {...props}
    />
  )
}

function InputGroupInput({ className, ...props }: ComponentProps<typeof InputPrimitive>) {
  return (
    <InputPrimitive
      className={cn(
        'h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground',
        className
      )}
      {...props}
    />
  )
}

function InputGroupAddon({
  align = 'inline-start',
  className,
  ...props
}: ComponentProps<'span'> & { align?: 'inline-start' | 'inline-end' }) {
  return (
    <span
      className={cn(
        'px-2 text-sm text-muted-foreground',
        align === 'inline-end' && 'order-last pr-2.5 pl-0',
        className
      )}
      {...props}
    />
  )
}

function Button({
  variant = 'outline',
  size = 'default',
  className,
  ...props
}: ComponentProps<'button'> & {
  variant?: 'outline' | 'ghost' | 'default'
  size?: 'default' | 'icon'
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg text-sm font-medium whitespace-nowrap',
        size === 'default' && 'h-8 px-3',
        size === 'icon' && 'size-8',
        variant === 'default' && 'bg-primary text-primary-foreground',
        variant === 'outline' && 'border border-border bg-background hover:bg-muted',
        variant === 'ghost' && 'text-muted-foreground hover:bg-muted hover:text-foreground',
        className
      )}
      {...props}
    />
  )
}

function RadioGroup({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive>) {
  return <RadioGroupPrimitive className={cn('flex flex-wrap gap-1', className)} {...props} />
}

function RadioGroupItem({ className, ...props }: ComponentProps<typeof Radio.Root>) {
  return (
    <Radio.Root
      className={cn(
        'size-4 shrink-0 rounded-full border border-input outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-checked:border-foreground data-checked:bg-foreground',
        className
      )}
      {...props}
    >
      <Radio.Indicator className="flex items-center justify-center">
        <span className="bg-field size-1.5 rounded-full" />
      </Radio.Indicator>
    </Radio.Root>
  )
}

function Select(props: ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root {...props} />
}

function SelectTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        control,
        'flex w-full items-center justify-between gap-2 pr-2 text-left',
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="text-muted-foreground">
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectValue(props: ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value className="min-w-0 flex-1 truncate" {...props} />
}

function SelectContent({ children, ...props }: ComponentProps<typeof SelectPrimitive.Popup>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner sideOffset={4} align="start" className="z-50">
        <SelectPrimitive.Popup
          className="bg-popover text-popover-foreground ring-border max-h-72 min-w-(--anchor-width) overflow-y-auto rounded-lg p-1 ring-1"
          {...props}
        >
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectGroup(props: ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group {...props} />
}

function SelectLabel({ className, ...props }: ComponentProps<typeof SelectPrimitive.GroupLabel>) {
  return (
    <SelectPrimitive.GroupLabel
      className={cn('px-2 py-1 text-xs text-muted-foreground', className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'flex cursor-default items-center rounded-md py-1.5 pr-2 pl-2 text-sm outline-none data-highlighted:bg-muted',
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'relative h-4.5 w-8 shrink-0 rounded-full bg-input outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-checked:bg-primary',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="bg-field block size-4 translate-x-px rounded-full transition-transform data-checked:translate-x-3.5" />
    </SwitchPrimitive.Root>
  )
}

function Table({ className, ...props }: ComponentProps<'table'>) {
  return <table className={cn('w-max max-w-full border-collapse text-sm', className)} {...props} />
}
function TableHeader({ className, ...props }: ComponentProps<'thead'>) {
  return <thead className={className} {...props} />
}
function TableBody(props: ComponentProps<'tbody'>) {
  return <tbody {...props} />
}
function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return <tr className={className} {...props} />
}
function TableHead({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      className={cn('px-2 py-1.5 text-left text-xs font-medium text-muted-foreground', className)}
      {...props}
    />
  )
}
function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('px-2 py-1.5 align-top', className)} {...props} />
}

function TooltipProvider({ delay = 0, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider delay={delay} {...props} />
}

function Tooltip(props: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root {...props} />
}

function TooltipTrigger(props: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger {...props} />
}

function TooltipContent({
  className,
  side = 'top',
  sideOffset = 6,
  align = 'center',
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          className={cn(
            'z-50 w-fit max-w-xs origin-(--transform-origin) rounded-lg bg-foreground px-3 py-1.5 text-left text-xs text-balance text-background shadow-md transition-[transform,opacity] duration-100 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0',
            className
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-xs data-[side=bottom]:top-1 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

function Popover(props: ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root {...props} />
}

function PopoverTrigger(props: ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger {...props} />
}

function PopoverContent({
  className,
  align = 'start',
  sideOffset = 4,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Popup> & {
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner align={align} sideOffset={sideOffset} className="z-50">
        <PopoverPrimitive.Popup
          className={cn(
            'rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-border outline-none',
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

function Calendar({ className, ...props }: ComponentProps<typeof DayPicker>) {
  const defaults = getDefaultClassNames()
  return (
    <DayPicker
      locale={fr}
      showOutsideDays
      captionLayout="dropdown"
      className={cn('p-2', className)}
      classNames={{
        root: cn('w-fit', defaults.root),
        months: cn('relative flex flex-col', defaults.months),
        month: cn('flex flex-col gap-3', defaults.month),
        month_caption: cn('flex h-8 items-center justify-center', defaults.month_caption),
        caption_label: cn('text-sm font-medium', defaults.caption_label),
        nav: cn('absolute inset-x-0 top-0 flex items-center justify-between', defaults.nav),
        button_previous: cn(
          'inline-flex size-7 items-center justify-center rounded-md hover:bg-muted',
          defaults.button_previous
        ),
        button_next: cn(
          'inline-flex size-7 items-center justify-center rounded-md hover:bg-muted',
          defaults.button_next
        ),
        weekdays: cn('flex', defaults.weekdays),
        weekday: cn('w-8 text-center text-xs text-muted-foreground', defaults.weekday),
        week: cn('mt-1 flex', defaults.week),
        day: cn('size-8 text-center text-sm', defaults.day),
        today: cn('font-medium', defaults.today),
        outside: cn('text-muted-foreground opacity-50', defaults.outside),
        selected: cn('rounded-md bg-primary text-primary-foreground', defaults.selected)
      }}
      components={{
        Chevron: ({ orientation, className: iconClass }) =>
          orientation === 'left' ? (
            <ChevronLeftIcon className={cn('size-4', iconClass)} />
          ) : orientation === 'right' ? (
            <ChevronRightIcon className={cn('size-4', iconClass)} />
          ) : (
            <ChevronDownIcon className={cn('size-4', iconClass)} />
          ),
        DayButton: ({
          day,
          modifiers,
          className: dayClass,
          ...dayProps
        }: ComponentProps<typeof DayButton>) => (
          <button
            type="button"
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-md text-sm hover:bg-muted',
              modifiers.selected && 'bg-primary text-primary-foreground hover:bg-primary',
              modifiers.today && !modifiers.selected && 'bg-muted',
              modifiers.outside && 'text-muted-foreground',
              dayClass
            )}
            {...dayProps}
          >
            {day.date.getDate()}
          </button>
        )
      }}
      {...props}
    />
  )
}

function parseIso(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? undefined : date
}

function toIso(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function DatePicker({
  id,
  value,
  onChange,
  placeholder = 'Choisir une date',
  className,
  month = false,
  'aria-label': ariaLabel
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  month?: boolean
  'aria-label'?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = parseIso(value)
  const label = selected
    ? selected.toLocaleDateString(
        'fr-FR',
        month
          ? { month: 'long', year: 'numeric' }
          : { day: '2-digit', month: 'short', year: 'numeric' }
      )
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        aria-label={ariaLabel}
        render={
          <Button
            variant="outline"
            className={cn(
              'w-40 justify-start border-input bg-field px-2.5 font-normal hover:bg-field-hover',
              !value && 'text-muted-foreground',
              className
            )}
          />
        }
      >
        <CalendarIcon className="text-muted-foreground size-4" />
        <span className="truncate">{label}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            onChange(date ? toIso(date) : '')
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

function Breadcrumb({ className, ...props }: ComponentProps<'nav'>) {
  return <nav aria-label="Fil d’Ariane" className={className} {...props} />
}

function BreadcrumbList({ className, ...props }: ComponentProps<'ol'>) {
  return (
    <ol
      className={cn(
        'flex flex-wrap items-center gap-1.5 text-sm break-words text-muted-foreground',
        className
      )}
      {...props}
    />
  )
}

function BreadcrumbItem({ className, ...props }: ComponentProps<'li'>) {
  return <li className={cn('inline-flex items-center gap-1', className)} {...props} />
}

function BreadcrumbLink({ className, ...props }: ComponentProps<'a'>) {
  return <a className={cn('transition-colors hover:text-foreground', className)} {...props} />
}

function BreadcrumbPage({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn('font-normal text-foreground', className)}
      {...props}
    />
  )
}

function BreadcrumbSeparator({ children, className, ...props }: ComponentProps<'li'>) {
  return (
    <li
      role="presentation"
      aria-hidden="true"
      className={cn('[&>svg]:size-3.5', className)}
      {...props}
    >
      {children ?? <ChevronRightIcon />}
    </li>
  )
}

function BreadcrumbEllipsis({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      role="presentation"
      aria-hidden="true"
      className={cn('flex size-5 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">Plus</span>
    </span>
  )
}

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Calendar,
  DatePicker,
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
}
