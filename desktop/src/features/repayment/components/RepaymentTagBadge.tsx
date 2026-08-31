import { Badge } from '@/shared/components/ui/badge'
import {
  colorizeBadgeStyle,
  columnValueStyleToBadge,
  resolveColumnValueBadgeDefaults
} from '@/shared/lib/ui-settings/tickets-table'
import { cn } from '@/shared/lib/utils'

import { getRepaymentTagMeta } from '../lib/repayment-tags'

interface Props {
  tag: string
  className?: string
}

export function RepaymentTagBadge({ tag, className }: Props) {
  const meta = getRepaymentTagMeta(tag)
  const badge = columnValueStyleToBadge(meta.color, resolveColumnValueBadgeDefaults())

  return (
    <Badge
      variant="secondary"
      className={cn('min-w-0 max-w-full', className)}
      style={colorizeBadgeStyle(badge)}
    >
      <span className="truncate">{meta.label}</span>
    </Badge>
  )
}
