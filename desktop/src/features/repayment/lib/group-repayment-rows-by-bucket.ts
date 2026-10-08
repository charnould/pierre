import { RECLASSIFY_PHASE } from '../../../../../shared/repayment-phases'
import type { TenantRepaymentRow } from './classify-tenants'
import { type RepaymentBucketId, repaymentBucketIds } from './repayment-bucket'

export type RepaymentBucketSectionRows = {
  bucket: RepaymentBucketId
  rows: TenantRepaymentRow[]
}

export function groupRepaymentRowsByBucket(
  rows: TenantRepaymentRow[],
  getBucket: (row: TenantRepaymentRow) => RepaymentBucketId
): RepaymentBucketSectionRows[] {
  const buckets = new Map<RepaymentBucketId, TenantRepaymentRow[]>(
    repaymentBucketIds().map((bucket) => [bucket, []])
  )
  const reclassify: TenantRepaymentRow[] = []

  for (const row of rows) {
    const bucket = getBucket(row)
    const list = buckets.get(bucket)
    if (list) list.push(row)
    else reclassify.push(row)
  }

  const sections = repaymentBucketIds().map((bucket) => ({
    bucket,
    rows: buckets.get(bucket) ?? []
  }))
  if (reclassify.length > 0) sections.push({ bucket: RECLASSIFY_PHASE, rows: reclassify })
  return sections
}
