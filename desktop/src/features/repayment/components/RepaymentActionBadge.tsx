import { Badge } from '@/shared/components/ui/badge'
import {
  colorizeBadgeStyle,
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
  className?: string
}

export function RepaymentActionBadge({ action, columnValues, className }: Props) {
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
      className={cn('min-w-0 max-w-full', className)}
      style={colorizeBadgeStyle(badge)}
    >
      <span className="truncate">{meta.label}</span>
    </Badge>
  )
}
