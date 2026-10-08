import { useCallback, useRef, useState } from 'react'

import { useWorkflowGeneration } from '@/features/workflow/hooks/useWorkflowGeneration'
import type { CreateActivityBody } from '@/shared/types/activites'

import type { TenantRepaymentRow } from '../lib/classify-tenants'
import type { RepaymentBucketId } from '../lib/repayment-bucket'
import {
  type RepaymentBulkAction,
  type RepaymentBulkResult,
  runRepaymentBulk
} from '../lib/repayment-bulk-action'
import { invalidateRepaymentTimelineCache } from '../lib/repayment-timeline-cache'

export type RepaymentBulkProgress = {
  index: number
  total: number
}

export function useRepaymentBulkActions(input: {
  url: string | undefined
  userLogin: string
  rows: readonly TenantRepaymentRow[]
  getBucket: (row: TenantRepaymentRow) => RepaymentBucketId
  setBucket: (id: string, phase: RepaymentBucketId) => void
  clearBucket: (id: string, phase: RepaymentBucketId) => void
  refreshNotifications: () => Promise<unknown>
  reloadLedger: () => void
  onInspectorRefresh: () => void
}) {
  const generation = useWorkflowGeneration({ url: input.url })
  const stopRef = useRef(false)
  const [progress, setProgress] = useState<RepaymentBulkProgress | null>(null)
  const {
    url,
    userLogin,
    rows,
    getBucket,
    setBucket,
    clearBucket,
    refreshNotifications,
    reloadLedger,
    onInspectorRefresh
  } = input

  const stop = useCallback(() => {
    stopRef.current = true
    generation.cancel()
  }, [generation])

  const run = useCallback(
    async (ids: readonly string[], action: RepaymentBulkAction): Promise<RepaymentBulkResult> => {
      stopRef.current = false
      const result = await runRepaymentBulk({
        ids,
        action,
        rows,
        getBucket,
        setBucket,
        clearBucket,
        generatedBy: userLogin,
        shouldStop: () => stopRef.current,
        onProgress: (index, total) => setProgress({ index, total }),
        writeActivity: (activity) => writeRepaymentActivity(url, activity),
        generate: async (id, mission) => {
          if (!url) return null
          const generated = await generation.generate({
            url,
            conv_id: crypto.randomUUID(),
            payload: JSON.stringify({ id_locataire: id, context: mission }),
            id_skill: 'repayment',
            files: []
          })
          return generated.ok ? generated.output : null
        }
      })
      setProgress(null)
      if (url && result.succeeded.length > 0) {
        const byId = new Map(rows.map((row) => [row.id_locataire, row]))
        for (const id of result.succeeded) {
          invalidateRepaymentTimelineCache(url, byId.get(id)?.id_client, id)
        }
        await refreshNotifications()
        reloadLedger()
        onInspectorRefresh()
      }
      return result
    },
    [
      clearBucket,
      generation,
      getBucket,
      onInspectorRefresh,
      refreshNotifications,
      reloadLedger,
      rows,
      setBucket,
      url,
      userLogin
    ]
  )

  return { progress, running: progress != null, stop, run }
}

async function writeRepaymentActivity(
  url: string | undefined,
  activity: CreateActivityBody
): Promise<boolean> {
  if (!url || !window.api?.createActivity) return false
  try {
    return (await window.api.createActivity({ url, ...activity })) != null
  } catch {
    return false
  }
}
