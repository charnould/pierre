import { Badge, type BadgeSize } from '@/shared/components/ui/badge'
import {
  columnValueStyleToBadge,
  findColumnValueStyle,
  normalizeColumnValueKey,
  resolveColumnValueBadgeDefaults,
  type ColumnValuesConfig
} from '@/shared/lib/ui-settings/tickets-table'
import { cn } from '@/shared/lib/utils'

import { getRepaymentActionMeta, type RepaymentActionId } from '../lib/repayment-action'

interface Props {
  action: RepaymentActionId
  columnValues?: ColumnValuesConfig
  size?: BadgeSize
  className?: string
}

export function RepaymentActionBadge({ action, columnValues, size = 'data', className }: Props) {
  const meta = getRepaymentActionMeta(action)
  const columnStyle = findColumnValueStyle(
    columnValues,
    'derniere_action_realisee',
    normalizeColumnValueKey(meta.label)
  )
  const badge = columnValueStyleToBadge(
    columnStyle ?? meta.color,
    resolveColumnValueBadgeDefaults()
  )

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
