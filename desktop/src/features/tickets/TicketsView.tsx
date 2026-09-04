import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useUiSettings } from '@/contexts/UiSettingsContext'
import type { NotificationsApi } from '@/features/activity/hooks/use-notifications'
import { useActivityRail } from '@/features/activity/lib/ActivityRailContext'
import { TicketReclamationDrawer } from '@/features/tickets/components/TicketReclamationDrawer'
import { TicketsTableView } from '@/features/tickets/components/TicketsTableView'
import { useTicketsNavigation } from '@/features/tickets/hooks/useTicketsNavigation'
import { TICKET_BUCKET_OPTIONS } from '@/features/tickets/lib/ticket-bucket'
import {
  type OpenTicketSheetOptions,
  type TicketComposeMode,
  useTicketsViewData
} from '@/features/tickets/lib/use-tickets-view-data'
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const { contextTarget } = useActivityRail()
  const { patchTicketsTable } = useUiSettings()
  const [ticketsRefreshNonce, setTicketsRefreshNonce] = useState(0)

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

  useEffect(() => {
    if (contextTarget != null) setSheetOpen(false)
  }, [contextTarget, setSheetOpen])

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
    onApplySheetTarget: (target) => {
      void resolveAndOpenSheet(target.id_reclamation, {
        activityId: target.activityId
      })
    }
  })

  const hasUnread = useCallback(
    (row: Parameters<typeof handleRowClick>[0]) => {
      const id = String(row.id_reclamation ?? '').trim()
      return id.length > 0 && notifications.hasUnreadFor('tickets', id)
    },
    [notifications]
  )

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
          version: 1,
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
      <div
        ref={scrollRef}
        className="flex min-h-0 w-full min-w-0 flex-1 scroll-pb-4 flex-col overflow-x-hidden overflow-y-auto overscroll-contain pb-6"
      >
        {TICKET_BUCKET_OPTIONS.map((bucket) => (
          <TicketsTableView
            key={bucket.id}
            hidden={hidden}
            url={settings.url}
            bucket={bucket.id}
            title={bucket.label}
            refreshNonce={ticketsRefreshNonce}
            hasUnread={hasUnread}
            selectedId={selected ? String(selected.id_reclamation ?? '').trim() : undefined}
            onRowClick={handleRowClick}
            scrollRef={scrollRef}
          />
        ))}
      </div>

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
        onCaseStateChange={() => setTicketsRefreshNonce((nonce) => nonce + 1)}
      />
    </div>
  )
}
