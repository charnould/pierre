import { useState } from 'react'

import { Input } from '@/shared/components/ui/input'

import { formatMonthDisplay, parseMonthInput } from '../../lib/apurement-plan/installments'

interface Props {
  value: string
  onChange: (month: string) => void
  id?: string
  className?: string
  placeholder?: string
  'aria-label'?: string
}

/** Saisie `MM/AAAA` stockée en `YYYY-MM`. */
export function MonthInput(props: Props) {
  return <MonthInputDraft key={props.value} {...props} />
}

function MonthInputDraft({
  value,
  onChange,
  id,
  className,
  placeholder = 'MM/AAAA',
  'aria-label': ariaLabel
}: Props) {
  const [draft, setDraft] = useState(() => formatMonthDisplay(value))

  return (
    <Input
      id={id}
      aria-label={ariaLabel ?? 'Mois'}
      placeholder={placeholder}
      inputMode="numeric"
      numeric
      className={className}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const parsed = parseMonthInput(draft)
        if (parsed) {
          onChange(parsed)
          setDraft(formatMonthDisplay(parsed))
          return
        }
        setDraft(formatMonthDisplay(value))
      }}
    />
  )
}
