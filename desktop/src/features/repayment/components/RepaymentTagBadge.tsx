import { Badge, type BadgeSize } from '@/shared/components/ui/badge'
import {
  columnValueStyleToBadge,
  resolveColumnValueBadgeDefaults
} from '@/shared/lib/ui-settings/tickets-table'
import { cn } from '@/shared/lib/utils'

import { getRepaymentTagMeta } from '../lib/repayment-tags'

interface Props {
  tag: string
  size?: BadgeSize
  className?: string
}

export function RepaymentTagBadge({ tag, size = 'data', className }: Props) {
  const meta = getRepaymentTagMeta(tag)
  const badge = columnValueStyleToBadge(meta.color, resolveColumnValueBadgeDefaults())

  return (
    <Badge
      variant="secondary"
      size={size}
      appearance={badge}
      className={cn('min-w-0 max-w-full', className)}
    >
      <span className="truncate">{meta.label}</span>
    </Badge>
  )
}
