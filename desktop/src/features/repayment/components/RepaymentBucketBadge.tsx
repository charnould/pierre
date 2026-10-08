import { CaseBucketBadge } from '@/shared/components/inspector/case-bucket-badge'
import type { ColumnValuesConfig } from '@/shared/lib/ui-settings/tickets-table'

import { getRepaymentBucketMeta, type RepaymentBucketId } from '../lib/repayment-bucket'

interface Props {
  bucket: RepaymentBucketId
  columnValues?: ColumnValuesConfig
  className?: string
}

export function RepaymentBucketBadge({ bucket, columnValues, className }: Props) {
  const meta = getRepaymentBucketMeta(bucket)
  return <CaseBucketBadge bucket={meta} columnValues={columnValues} className={className} />
}
