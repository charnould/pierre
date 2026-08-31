import { cn } from '@/shared/lib/utils'

import { formatEuro } from '../lib/format-repayment'

interface Props {
  amount: number
  className?: string
}

export function DebtAmountCell({ amount, className }: Props) {
  return (
    <span className={cn('truncate tabular-nums', className)}>
      {amount > 0 ? formatEuro(amount) : '—'}
    </span>
  )
}
