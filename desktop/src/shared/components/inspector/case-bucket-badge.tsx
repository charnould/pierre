import { Badge } from '@/shared/components/ui/badge'
import type { CaseBucketOption } from '@/shared/lib/activities/case-workflow-config'
import {
  type ColumnValuesConfig,
  findColumnValueStyle,
  normalizeColumnValueKey
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

  return (
    <Badge
      variant={columnStyle ? 'secondary' : 'outline'}
      className={cn('max-w-full min-w-0', className)}
    >
      <span className="truncate">{bucket.label}</span>
    </Badge>
  )
}
