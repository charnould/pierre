import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'

import { getRepaymentTagMeta } from '../lib/repayment-tags'

interface Props {
  tag: string
  className?: string
}

export function RepaymentTagBadge({ tag, className }: Props) {
  const meta = getRepaymentTagMeta(tag)

  return (
    <Badge variant="secondary" className={cn('max-w-full min-w-0', className)}>
      <span className="truncate">{meta.label}</span>
    </Badge>
  )
}
