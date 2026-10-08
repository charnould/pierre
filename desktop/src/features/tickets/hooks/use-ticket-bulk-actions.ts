import { useCallback, useRef, useState } from 'react'

import { useWorkflowGeneration } from '@/features/workflow/hooks/useWorkflowGeneration'
import type { TicketRow } from '@/shared/types'
import type { CreateActivityBody } from '@/shared/types/activites'

import {
  runTicketBulk,
  type TicketBulkAction,
  type TicketBulkResult
} from '../lib/ticket-bulk-action'

export type TicketBulkProgress = {
  index: number
  total: number
}

export function useTicketBulkActions(input: {
  url: string | undefined
  userLogin: string
  refreshNotifications: () => Promise<unknown>
  onChanged: () => void
}) {
  const generation = useWorkflowGeneration({ url: input.url })
  const stopRef = useRef(false)
  const [progress, setProgress] = useState<TicketBulkProgress | null>(null)
  const { url, userLogin, refreshNotifications, onChanged } = input

  const stop = useCallback(() => {
    stopRef.current = true
    generation.cancel()
  }, [generation])

  const run = useCallback(
    async (rows: readonly TicketRow[], action: TicketBulkAction): Promise<TicketBulkResult> => {
      stopRef.current = false
      const result = await runTicketBulk({
        rows,
        action,
        generatedBy: userLogin,
        shouldStop: () => stopRef.current,
        onProgress: (index, total) => setProgress({ index, total }),
        writeActivity: (activity) => writeTicketActivity(url, activity),
        generate: async (id, mission) => {
          if (!url) return null
          const generated = await generation.generate({
            url,
            conv_id: crypto.randomUUID(),
            payload: JSON.stringify({ id_reclamation: id, context: mission }),
            id_skill: 'replies',
            files: []
          })
          return generated.ok ? generated.output : null
        }
      })
      setProgress(null)
      if (url && result.succeeded.length > 0) {
        await refreshNotifications()
        onChanged()
      }
      return result
    },
    [generation, onChanged, refreshNotifications, url, userLogin]
  )

  return { progress, running: progress != null, stop, run }
}

async function writeTicketActivity(
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
