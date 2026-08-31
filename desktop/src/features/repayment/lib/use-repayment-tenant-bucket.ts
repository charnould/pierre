import { useCallback, useState } from 'react'

import type { TenantRepaymentRow } from './classify-tenants'
import { resolveRepaymentBucket, type RepaymentBucketId } from './repayment-bucket'

type OptimisticBuckets = Partial<Record<string, string>>

export function useRepaymentTenantBucket(rows: TenantRepaymentRow[]) {
  const [optimistic, setOptimistic] = useState<OptimisticBuckets>({})

  const getBucket = useCallback(
    (id_locataire: string): RepaymentBucketId => {
      const persisted = rows.find((row) => row.id_locataire === id_locataire)?.['bucket']
      return resolveRepaymentBucket(
        optimistic[id_locataire] ?? (typeof persisted === 'string' ? persisted : undefined)
      )
    },
    [optimistic, rows]
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
