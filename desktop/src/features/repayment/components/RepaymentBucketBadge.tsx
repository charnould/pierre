import { CaseBucketBadge } from '@/shared/components/inspector/case-bucket-badge'
import type { BadgeSize } from '@/shared/components/ui/badge'
import type { ColumnValuesConfig } from '@/shared/lib/ui-settings/tickets-table'

import { getRepaymentBucketMeta, type RepaymentBucketId } from '../lib/repayment-bucket'

interface Props {
  bucket: RepaymentBucketId
  columnValues?: ColumnValuesConfig
  size?: BadgeSize
  className?: string
}

export function RepaymentBucketBadge({ bucket, columnValues, size, className }: Props) {
  const meta = getRepaymentBucketMeta(bucket)
  return (
    <CaseBucketBadge bucket={meta} columnValues={columnValues} size={size} className={className} />
  )
}
