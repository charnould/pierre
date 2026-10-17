import { useState } from 'react'

import { Input } from '@/shared/components/ui/input'

import { formatInstallmentDate, parseInstallmentDate } from '../../lib/apurement-plan/installments'

interface Props {
  value: string
  onChange: (date: string) => void
  id?: string
  className?: string
  disabled?: boolean
  'aria-label'?: string
}

/** Saisie texte `JJ/MM/AAAA` stockée en `YYYY-MM-DD`. */
export function InstallmentDateInput(props: Props) {
  return <InstallmentDateInputDraft key={props.value} {...props} />
}

function InstallmentDateInputDraft({
  value,
  onChange,
  id,
  className,
  disabled,
  'aria-label': ariaLabel
}: Props) {
  const [draft, setDraft] = useState(() => formatInstallmentDate(value))

  return (
    <Input
      id={id}
      aria-label={ariaLabel ?? 'Date de l’échéance'}
      disabled={disabled}
      placeholder="JJ/MM/AAAA"
      inputMode="numeric"
      numeric
      className={className}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const parsed = parseInstallmentDate(draft)
        if (parsed) {
          onChange(parsed)
          setDraft(formatInstallmentDate(parsed))
          return
        }
        setDraft(formatInstallmentDate(value))
      }}
    />
  )
}
