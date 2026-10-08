import { Badge } from '@/shared/components/ui/badge'
import {
  type ColumnValuesConfig,
  findColumnValueStyle,
  normalizeColumnValueKey
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

  return (
    <Badge
      variant={columnStyle ? 'secondary' : 'outline'}
      className={cn('max-w-full min-w-0', className)}
    >
      <span className="truncate">{meta.label}</span>
    </Badge>
  )
}
