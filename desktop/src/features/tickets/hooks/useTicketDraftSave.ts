import { useCallback } from 'react'

import { persistTicketDraft } from '@/features/tickets/lib/persist-ticket-draft'
import type { PutTicketDraftPayload } from '@/shared/types/ticket-draft'

type Options = {
  onSaved?: () => void
}

/**
 * Persists ticket drafts via IPC. Does not gate on UI "enabled" — callers decide when to save.
 */
export function useTicketDraftSave({ onSaved }: Options = {}) {
  const saveDraft = useCallback(
    async (url: string | undefined, payload: PutTicketDraftPayload): Promise<boolean> => {
      const ok = await persistTicketDraft(url, payload)
      if (ok) onSaved?.()
      return ok
    },
    [onSaved]
  )

  return { saveDraft }
}
