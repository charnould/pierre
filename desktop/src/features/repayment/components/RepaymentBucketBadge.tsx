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

import { getRepaymentBucketMeta, type RepaymentBucketId } from '../lib/repayment-bucket'

interface Props {
  bucket: RepaymentBucketId
  columnValues?: ColumnValuesConfig
  className?: string
}

export function RepaymentBucketBadge({ bucket, columnValues, className }: Props) {
  const meta = getRepaymentBucketMeta(bucket)
  const columnStyle = findColumnValueStyle(
    columnValues,
    'bucket',
    normalizeColumnValueKey(meta.label)
  )

  if (columnStyle) {
    const badge = columnValueStyleToBadge(columnStyle, resolveColumnValueBadgeDefaults())
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

  return (
    <Badge variant="outline" className={cn('min-w-0 max-w-full', className)}>
      <span className="truncate">{meta.label}</span>
    </Badge>
  )
}
