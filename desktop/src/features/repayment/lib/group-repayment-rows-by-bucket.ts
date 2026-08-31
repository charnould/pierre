import type { TenantRepaymentRow } from './classify-tenants'
import { REPAYMENT_BUCKET_IDS, type RepaymentBucketId } from './repayment-bucket'

export type RepaymentBucketSectionRows = {
  bucket: RepaymentBucketId
  rows: TenantRepaymentRow[]
}

export function groupRepaymentRowsByBucket(
  rows: TenantRepaymentRow[],
  getBucket: (row: TenantRepaymentRow) => RepaymentBucketId
): RepaymentBucketSectionRows[] {
  const buckets = new Map<RepaymentBucketId, TenantRepaymentRow[]>(
    REPAYMENT_BUCKET_IDS.map((bucket) => [bucket, []])
  )

  for (const row of rows) {
    const bucket = getBucket(row)
    const list = buckets.get(bucket)
    if (list) list.push(row)
    else buckets.get(REPAYMENT_BUCKET_IDS[0]!)!.push(row)
  }

  return REPAYMENT_BUCKET_IDS.map((bucket) => ({
    bucket,
    rows: buckets.get(bucket) ?? []
  }))
}
