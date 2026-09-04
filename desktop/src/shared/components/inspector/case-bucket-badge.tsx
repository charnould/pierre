import { Badge } from '@/shared/components/ui/badge'
import type { CaseBucketOption } from '@/shared/lib/activities/case-workflow-config'
import {
  colorizeBadgeStyle,
  columnValueStyleToBadge,
  findColumnValueStyle,
  normalizeColumnValueKey,
  resolveColumnValueBadgeDefaults,
  type ColumnValuesConfig
} from '@/shared/lib/ui-settings/tickets-table'
import { cn } from '@/shared/lib/utils'

export function CaseBucketBadge({
  bucket,
  columnValues,
  className
}: {
  bucket: CaseBucketOption
  columnValues?: ColumnValuesConfig
  className?: string
}) {
  const columnStyle = findColumnValueStyle(
    columnValues,
    'bucket',
    normalizeColumnValueKey(bucket.label)
  )
  const style = columnStyle
    ? colorizeBadgeStyle(columnValueStyleToBadge(columnStyle, resolveColumnValueBadgeDefaults()))
    : undefined

  return (
    <Badge
      variant={columnStyle ? 'secondary' : 'outline'}
      className={cn('min-w-0 max-w-full', className)}
      style={style}
    >
      <span className="truncate">{bucket.label}</span>
    </Badge>
  )
}
