import { useCallback, useEffect, useMemo, useState } from 'react'

import { useUiSettings } from '@/contexts/UiSettingsContext'
import type { NotificationsApi } from '@/features/activity/hooks/use-notifications'
import { useActivityRail } from '@/features/activity/lib/ActivityRailContext'
import { TicketReclamationDrawer } from '@/features/tickets/components/TicketReclamationDrawer'
import { TicketsActivityDrawer } from '@/features/tickets/components/TicketsActivityDrawer'
import { TicketsTableView } from '@/features/tickets/components/TicketsTableView'
import { useTicketsNavigation } from '@/features/tickets/hooks/useTicketsNavigation'
import { generateTicketIds } from '@/features/tickets/lib/generate-ticket-ids'
import type { TicketSkillKey } from '@/features/tickets/lib/knowledge-skills'
import { persistTicketReclamation } from '@/features/tickets/lib/persist-ticket-reclamation'
import {
  type OpenTicketSheetOptions,
  type TicketComposeMode,
  useTicketsViewData
} from '@/features/tickets/lib/use-tickets-view-data'
import type { ActivityTarget } from '@/shared/lib/navigation-snapshot'
import type { Tab } from '@/shared/lib/tabs'
import { cn } from '@/shared/lib/utils'
import type { Settings } from '@/shared/types'

interface Props {
  hidden: boolean
  settings: Settings
  onNavigate: (tab: Tab) => void
  agentName: string
  userLogin: string
  notifications: NotificationsApi
}

export function TicketsView({
  hidden,
  settings,
  onNavigate: _onNavigate,
  agentName: _agentName,
  userLogin,
  notifications
}: Props) {
  const [ticketsRefreshNonce, setTicketsRefreshNonce] = useState(0)
  const [ticketActivitySheet, setTicketActivitySheet] = useState<Extract<
    ActivityTarget,
    { view: 'tickets' }
  > | null>(null)
  const [ticketSheetToken, setTicketSheetToken] = useState(0)

  const { contextTarget } = useActivityRail()
  const { patchTicketsTable } = useUiSettings()

  const ticketsDeps = useMemo(() => ({ notifications, userLogin }), [notifications, userLogin])

  const {
    selected,
    sheetOpen,
    setSheetOpen,
    sheetOpenToken,
    initialComposeMode,
    openTicketSheet,
    handleRowClick,
    postActivity,
    activityTarget
  } = useTicketsViewData(ticketsDeps)

  const bumpTicketsRefresh = useCallback(() => {
    setTicketsRefreshNonce((n) => n + 1)
  }, [])

  useEffect(() => {
    if (contextTarget != null) setSheetOpen(false)
  }, [contextTarget, setSheetOpen])

  const openTicketActivitySheet = useCallback(
    (target: Extract<ActivityTarget, { view: 'tickets' }>) => {
      setTicketActivitySheet(target)
      setTicketSheetToken((token) => token + 1)
      void patchTicketsTable({
        columnFilters: { id_reclamation: [target.id_reclamation] }
      })
    },
    [patchTicketsTable]
  )

  const resolveAndOpenSheet = useCallback(
    async (
      id_reclamation: string,
      options?: OpenTicketSheetOptions & { initialComposeMode?: TicketComposeMode }
    ) => {
      const url = settings.url
      if (!url) return
      const res = await window.api.getTickets({
        url,
        limit: 1,
        filters: { id_reclamation: [id_reclamation] }
      })
      const row = res?.data?.[0]
      if (row) {
        openTicketSheet(row, options)
        void patchTicketsTable({ columnFilters: { id_reclamation: [id_reclamation] } })
      }
    },
    [openTicketSheet, settings.url, patchTicketsTable]
  )

  useTicketsNavigation({
    sheetActivityTarget: activityTarget,
    railActivityTarget: ticketActivitySheet,
    onApplySheetTarget: (target) => {
      void resolveAndOpenSheet(target.id_reclamation, {
        activityId: target.activityId
      })
    },
    onApplyRailTarget: (target) => {
      openTicketActivitySheet(target)
    }
  })

  const handleDraftIconClick = useCallback(
    async (
      id_reclamation: string,
      format: TicketSkillKey,
      _hasDraft: boolean,
      _draft_id_skills?: string[],
      _draft_answer_channel?: string | null
    ) => {
      const composeMode: TicketComposeMode =
        format === 'ticketReplyLetter' ? 'letter' : format === 'ticketReplyEmail' ? 'email' : null
      if (!composeMode) return
      await resolveAndOpenSheet(id_reclamation, { initialComposeMode: composeMode })
    },
    [resolveAndOpenSheet]
  )

  const openManualMessage = useCallback(async () => {
    const ids = generateTicketIds()
    const url = settings.url
    if (url) {
      await persistTicketReclamation(url, ids)
      bumpTicketsRefresh()
      const res = await window.api.getTickets({
        url,
        limit: 1,
        filters: { id_reclamation: [ids.id_reclamation] }
      })
      const row = res?.data?.[0]
      if (row) {
        openTicketSheet(row, { initialComposeMode: 'email' })
      }
    }
  }, [settings.url, bumpTicketsRefresh, openTicketSheet])

  const handlePostActivity = useCallback(
    (type: string, statut: string, contenu: string) =>
      postActivity(
        type as Parameters<typeof postActivity>[0],
        statut as Parameters<typeof postActivity>[1],
        contenu
      ),
    [postActivity]
  )

  const handleSummarizeActivity = useCallback(
    async (content: string) =>
      postActivity(
        'ticket_summary',
        'logged',
        JSON.stringify({
          titre: 'Point de situation',
          contenu: content
        })
      ),
    [postActivity]
  )

  return (
    <div
      data-tab-panel
      className={cn(
        'relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background',
        hidden ? 'hidden' : 'flex'
      )}
    >
      <TicketsTableView
        hidden={hidden}
        url={settings.url}
        ticketsRefreshNonce={ticketsRefreshNonce}
        onDraftIconClick={handleDraftIconClick}
        onRowClick={handleRowClick}
        onOpenManualMessage={openManualMessage}
      />

      <TicketReclamationDrawer
        url={settings.url}
        userLogin={userLogin}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        sheetOpenToken={sheetOpenToken}
        ticket={selected}
        initialComposeMode={initialComposeMode}
        highlightActivityId={activityTarget?.activityId}
        onPostActivity={handlePostActivity}
        onSummarizeActivity={handleSummarizeActivity}
      />

      <TicketsActivityDrawer
        url={settings.url}
        target={ticketActivitySheet}
        sheetOpenToken={ticketSheetToken}
        onClose={() => setTicketActivitySheet(null)}
      />
    </div>
  )
}
