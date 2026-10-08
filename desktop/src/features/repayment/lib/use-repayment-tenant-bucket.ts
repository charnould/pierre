import { useCallback, useMemo, useState } from 'react'

import type { TenantRepaymentRow } from './classify-tenants'
import { type RepaymentBucketId, resolveRepaymentBucket } from './repayment-bucket'

type OptimisticBuckets = Partial<Record<string, string>>

export function useRepaymentTenantBucket(rows: TenantRepaymentRow[]) {
  const [optimistic, setOptimistic] = useState<OptimisticBuckets>({})
  const persisted = useMemo(() => {
    const buckets = new Map<string, string>()
    for (const row of rows) {
      const value = row['bucket']
      if (typeof value === 'string') buckets.set(row.id_locataire, value)
    }
    return buckets
  }, [rows])

  const getBucket = useCallback(
    (id_locataire: string): RepaymentBucketId =>
      resolveRepaymentBucket(optimistic[id_locataire] ?? persisted.get(id_locataire)),
    [optimistic, persisted]
  )

  const setBucket = useCallback((id_locataire: string, bucket: RepaymentBucketId) => {
    setOptimistic((prev) => ({ ...prev, [id_locataire]: bucket }))
  }, [])

  const clearBucket = useCallback((id_locataire: string, expected?: RepaymentBucketId) => {
    setOptimistic((prev) => {
      if (!(id_locataire in prev)) return prev
      if (expected !== undefined && prev[id_locataire] !== expected) return prev
      const next = { ...prev }
      delete next[id_locataire]
      return next
    })
  }, [])

  return {
    clearBucket,
    getBucket,
    setBucket
  }
}
