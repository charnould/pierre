import { Badge } from '@/shared/components/ui/badge'
import {
  colorizeBadgeStyle,
  columnValueStyleToBadge,
  findColumnValueStyle,
  normalizeColumnValueKey,
  resolveColumnValueBadgeDefaults,
  type ColumnValuesConfig
} from '@/shared/lib/ui-settings/tickets-table'

import { getRepaymentBucketMeta, type RepaymentBucketId } from '../lib/repayment-bucket'

interface Props {
  value: RepaymentBucketId
  columnValues?: ColumnValuesConfig
}

function BucketLabelBadge({
  label,
  columnValues
}: {
  label: string
  columnValues?: ColumnValuesConfig
}) {
  const columnStyle = findColumnValueStyle(columnValues, 'bucket', normalizeColumnValueKey(label))

  if (columnStyle) {
    return (
      <Badge
        variant="secondary"
        className="max-w-full min-w-0"
        style={colorizeBadgeStyle(
          columnValueStyleToBadge(columnStyle, resolveColumnValueBadgeDefaults())
        )}
      >
        <span className="truncate">{label}</span>
      </Badge>
    )
  }

  return <span className="truncate">{label}</span>
}

export function RepaymentBucketCell({ value, columnValues }: Props) {
  const meta = getRepaymentBucketMeta(value)

  return (
    <div data-repayment-status-cell className="min-w-0">
      <BucketLabelBadge label={meta.label} columnValues={columnValues} />
    </div>
  )
}
