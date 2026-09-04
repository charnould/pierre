import { useCallback, useMemo, useState } from 'react'

import type { NotificationsApi } from '@/features/activity/hooks/use-notifications'
import type { ActivityTarget } from '@/shared/lib/navigation-snapshot'
import { getTicketCellText } from '@/shared/lib/ticket-row'
import type { TicketRow } from '@/shared/types'
import type { ActivityStatus, ActivityType } from '@/shared/types/activites'

export type TicketComposeMode =
  | 'comment'
  | 'todo'
  | 'action'
  | 'bucket'
  | 'tags'
  | 'assignment'
  | 'rcs'
  | 'email'
  | 'letter'
  | 'summarize'
  | null

export type TicketsViewDataDeps = {
  notifications: NotificationsApi
  userLogin: string
}

export type OpenTicketSheetOptions = {
  activityId?: number
  initialComposeMode?: TicketComposeMode
  markRead?: boolean
}

export function useTicketsViewData(deps: TicketsViewDataDeps) {
  const [selected, setSelected] = useState<TicketRow | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetOpenToken, setSheetOpenToken] = useState(0)
  const [activityNoteId, setActivityNoteId] = useState<number | undefined>()
  const [initialComposeMode, setInitialComposeMode] = useState<TicketComposeMode>(null)

  const openTicketSheet = useCallback(
    (row: TicketRow, options?: OpenTicketSheetOptions) => {
      const id = getTicketCellText(row, 'id_reclamation')
      if (!id) return

      if (options?.markRead !== false) {
        void deps.notifications.markAllReadForRef('tickets', id)
      }

      setSelected(row)
      setSheetOpen(true)
      setActivityNoteId(options?.activityId)
      setInitialComposeMode(options?.initialComposeMode ?? null)
      setSheetOpenToken((token) => token + 1)
    },
    [deps.notifications]
  )

  const handleRowClick = useCallback(
    (row: TicketRow) => {
      openTicketSheet(row)
    },
    [openTicketSheet]
  )

  const postActivity = useCallback(
    async (type: ActivityType, statut: ActivityStatus, contenu: string): Promise<number | null> => {
      if (!selected) return null
      const id = getTicketCellText(selected, 'id_reclamation')
      if (!id) return null

      const res = await deps.notifications.createActivity({
        contexte: 'tickets',
        ref: id,
        type,
        statut,
        contenu
      })
      return res?.data?.id ?? null
    },
    [deps.notifications, selected]
  )

  const activityTarget = useMemo((): Extract<ActivityTarget, { view: 'tickets' }> | undefined => {
    if (!sheetOpen || !selected) return undefined
    const id = getTicketCellText(selected, 'id_reclamation')
    if (!id) return undefined
    return { view: 'tickets', id_reclamation: id, activityId: activityNoteId }
  }, [activityNoteId, selected, sheetOpen])

  return {
    selected,
    sheetOpen,
    setSheetOpen,
    sheetOpenToken,
    initialComposeMode,
    setInitialComposeMode,
    activityNoteId,
    openTicketSheet,
    handleRowClick,
    postActivity,
    activityTarget
  }
}
