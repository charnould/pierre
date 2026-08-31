import { useCallback, useEffect, useState } from 'react'

import { RepaymentActivityDrawer } from '@/features/activity/components/RepaymentActivityDrawer'
import { UpdatesActivityDrawer } from '@/features/activity/components/UpdatesActivityDrawer'
import { useNotifications } from '@/features/activity/hooks/use-notifications'
import { useActivityRail } from '@/features/activity/lib/ActivityRailContext'
import { TicketReclamationDrawer } from '@/features/tickets/components/TicketReclamationDrawer'
import type { TicketRow } from '@/shared/types'
import type { ActivityStatus, ActivityType } from '@/shared/types/activites'

interface Props {
  url: string | undefined
  userLogin: string
}

async function fetchTicketRow(url: string, id_reclamation: string): Promise<TicketRow | null> {
  if (!window.api?.getTickets) return null
  const res = await window.api.getTickets({
    url,
    limit: 1,
    filters: { id_reclamation: [id_reclamation] }
  })
  return res?.data?.[0] ?? null
}

/**
 * Corps de l’Inspector droit. ActivityPanel fournit un Drawer frère du drawer
 * inférieur afin de le superposer sans animation ni réduction « nested ».
 */
export function ActivityContextNested({ url, userLogin }: Props) {
  const { contextTarget, contextOpenToken, closeContextTarget } = useActivityRail()
  const notifications = useNotifications(url, userLogin, Boolean(url) && contextTarget != null)
  const [ticket, setTicket] = useState<TicketRow | null>(null)

  useEffect(() => {
    if (!contextTarget || contextTarget.view !== 'tickets' || !url) return
    let cancelled = false
    void fetchTicketRow(url, contextTarget.id_reclamation).then((row) => {
      if (!cancelled) setTicket(row)
    })
    return () => {
      cancelled = true
    }
  }, [contextTarget, url])

  const resolvedTicket = contextTarget?.view === 'tickets' ? ticket : null

  const handlePostActivity = useCallback(
    async (type: string, statut: string, contenu: string) => {
      if (!contextTarget || contextTarget.view !== 'tickets') return null
      const res = await notifications.createActivity({
        contexte: 'tickets',
        ref: contextTarget.id_reclamation,
        type: type as ActivityType,
        statut: statut as ActivityStatus,
        contenu
      })
      return res?.data?.id ?? null
    },
    [contextTarget, notifications]
  )

  const handleSummarizeActivity = useCallback(
    async (content: string) => {
      if (!contextTarget || contextTarget.view !== 'tickets') return null
      const res = await notifications.createActivity({
        contexte: 'tickets',
        ref: contextTarget.id_reclamation,
        type: 'ticket_summary',
        statut: 'logged',
        contenu: JSON.stringify({ contenu: content, skill: 'ticket.summarize-ticket' })
      })
      return res?.data?.id ?? null
    },
    [contextTarget, notifications]
  )

  if (!contextTarget) return null

  if (contextTarget.view === 'repayment') {
    return (
      <RepaymentActivityDrawer
        url={url}
        userLogin={userLogin}
        tenantId={contextTarget.tenantId}
        idClient={contextTarget.idClient}
        notificationId={contextTarget.activityId}
        sheetOpenToken={contextOpenToken}
        onClose={closeContextTarget}
      />
    )
  }

  if (contextTarget.view === 'updates') {
    return (
      <UpdatesActivityDrawer
        slug={contextTarget.slug}
        title={contextTarget.title}
        date={contextTarget.date}
        onClose={closeContextTarget}
      />
    )
  }

  if (contextTarget.view === 'automations') return null
  if (contextTarget.view !== 'tickets' || !resolvedTicket) return null

  return (
    <TicketReclamationDrawer
      url={url}
      userLogin={userLogin}
      open
      onOpenChange={(next) => {
        if (!next) closeContextTarget()
      }}
      sheetOpenToken={contextOpenToken}
      embedded
      ticket={resolvedTicket}
      initialComposeMode={null}
      highlightActivityId={contextTarget.activityId}
      onPostActivity={handlePostActivity}
      onSummarizeActivity={handleSummarizeActivity}
    />
  )
}
