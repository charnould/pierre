import { useState } from 'react'

import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/lib/utils'

import { formatYearMonthDisplay, parseYearMonthInput } from '../../lib/apurement-plan/installments'

interface Props {
  value: string
  onChange: (yearMonth: string) => void
  id?: string
  className?: string
  disabled?: boolean
  'aria-label'?: string
}

/** Saisie texte `MM/YYYY` stockée en `YYYY-MM`. */
export function YearMonthInput(props: Props) {
  return <YearMonthInputDraft key={props.value} {...props} />
}

function YearMonthInputDraft({
  value,
  onChange,
  id,
  className,
  disabled,
  'aria-label': ariaLabel
}: Props) {
  const [draft, setDraft] = useState(() => formatYearMonthDisplay(value))

  return (
    <Input
      id={id}
      aria-label={ariaLabel ?? 'Mois et année'}
      disabled={disabled}
      placeholder="MM/AAAA"
      inputMode="numeric"
      className={cn('tabular-nums', className)}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const parsed = parseYearMonthInput(draft)
        if (parsed) {
          onChange(parsed)
          setDraft(formatYearMonthDisplay(parsed))
          return
        }
        setDraft(formatYearMonthDisplay(value))
      }}
    />
  )
}
