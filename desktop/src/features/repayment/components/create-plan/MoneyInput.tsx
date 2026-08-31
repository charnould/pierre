import { useState } from 'react'

import { InputGroup, InputGroupAddon, InputGroupInput } from '@/shared/components/ui/input-group'

import { formatMoneyInput, parseMoneyInput } from '../../lib/apurement-plan/money'

interface Props {
  value: number
  onChange: (value: number) => void
  id?: string
  className?: string
  placeholder?: string
  disabled?: boolean
  'aria-label'?: string
}

export function MoneyInput(props: Props) {
  return <MoneyInputDraft key={props.value} {...props} />
}

function MoneyInputDraft({
  value,
  onChange,
  id,
  className,
  placeholder = '0',
  disabled,
  'aria-label': ariaLabel
}: Props) {
  const [draft, setDraft] = useState(() => formatMoneyInput(value))

  return (
    <InputGroup className={className}>
      <InputGroupInput
        id={id}
        aria-label={ariaLabel ?? 'Montant'}
        inputMode="decimal"
        disabled={disabled}
        placeholder={placeholder}
        className="tabular-nums"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const next = parseMoneyInput(draft)
          onChange(next)
          setDraft(formatMoneyInput(next))
        }}
      />
      <InputGroupAddon align="inline-end">€</InputGroupAddon>
    </InputGroup>
  )
}
