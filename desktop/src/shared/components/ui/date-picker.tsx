import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import { fr } from 'react-day-picker/locale'

import { Button } from '@/shared/components/ui/button'
import { Calendar } from '@/shared/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/lib/utils'

/** Parse `YYYY-MM-DD` as a local calendar date. Never use `toISOString()` here. */
export function parseLocalIsoDate(value: string): Date | undefined {
  if (!value) return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined
  }
  return date
}

/** Format a Date as local `YYYY-MM-DD`. */
export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDisplay(value: string): string {
  const date = parseLocalIsoDate(value)
  if (!date) return ''
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

interface Props {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  size?: 'default' | 'sm' | 'xs'
  'aria-label'?: string
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = 'Choisir une date',
  disabled,
  className,
  size = 'default',
  'aria-label': ariaLabel
}: Props) {
  const [open, setOpen] = useState(false)
  const selected = parseLocalIsoDate(value)
  const now = new Date()
  const startMonth = new Date(now.getFullYear() - 100, 0)
  const endMonth = new Date(now.getFullYear() + 10, 11)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        render={
          <Button
            type="button"
            variant="outline"
            size={size}
            className={cn(
              'bg-background justify-start font-normal',
              !value && 'text-muted-foreground',
              className
            )}
          />
        }
      >
        <CalendarIcon />
        {value ? formatDisplay(value) : placeholder}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={fr}
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={endMonth}
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            onChange(date ? toLocalIsoDate(date) : '')
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
