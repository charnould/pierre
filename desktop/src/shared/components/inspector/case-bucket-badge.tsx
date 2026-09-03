import { Badge, type BadgeSize } from '@/shared/components/ui/badge'
import type { CaseBucketOption } from '@/shared/lib/activities/case-workflow-config'
import {
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
  size = 'data',
  className
}: {
  bucket: CaseBucketOption
  columnValues?: ColumnValuesConfig
  size?: BadgeSize
  className?: string
}) {
  const columnStyle = findColumnValueStyle(
    columnValues,
    'bucket',
    normalizeColumnValueKey(bucket.label)
  )
  const appearance = columnStyle
    ? columnValueStyleToBadge(columnStyle, resolveColumnValueBadgeDefaults())
    : undefined

  return (
    <Badge
      variant={columnStyle ? 'secondary' : 'outline'}
      size={size}
      appearance={appearance}
      className={cn('min-w-0 max-w-full', className)}
    >
      <span className="truncate">{bucket.label}</span>
    </Badge>
  )
}
