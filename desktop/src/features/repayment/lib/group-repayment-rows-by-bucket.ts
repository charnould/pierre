import type { TenantRepaymentRow } from './classify-tenants'
import { repaymentBucketIds, type RepaymentBucketId } from './repayment-bucket'

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

  for (const row of rows) {
    const bucket = getBucket(row)
    const list = buckets.get(bucket)
    if (list) list.push(row)
    else buckets.get(repaymentBucketIds()[0]!)!.push(row)
  }

  return repaymentBucketIds().map((bucket) => ({
    bucket,
    rows: buckets.get(bucket) ?? []
  }))
}
