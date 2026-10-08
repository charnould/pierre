import { FolderX, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { RepaymentActivityDrawer } from '@/features/activity/components/RepaymentActivityDrawer'
import { useNotifications } from '@/features/activity/hooks/use-notifications'
import { useActivityRail } from '@/features/activity/lib/ActivityRailContext'
import { TicketReclamationDrawer } from '@/features/tickets/components/TicketReclamationDrawer'
import { InspectorSplit } from '@/shared/components/inspector/inspector-split'
import { InspectorTimelineSkeleton } from '@/shared/components/inspector/inspector-timeline-skeleton'
import { ModuleGate } from '@/shared/components/ModuleGate'
import { Button } from '@/shared/components/ui/button'
import { DrawerHeader, DrawerTitle } from '@/shared/components/ui/drawer'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import type { TicketRow } from '@/shared/types'
import type { ActivityType } from '@/shared/types/activites'

interface Props {
  url: string | undefined
  userLogin: string
}

type TicketState = {
  key: string
  ticket: TicketRow | null
  settled: boolean
}

async function fetchTicketRow(url: string, idReclamation: string): Promise<TicketRow | null> {
  if (!window.api?.getTickets) return null
  const response = await window.api.getTickets({
    url,
    limit: 1,
    filters: { id_reclamation: [idReclamation] }
  })
  return response?.data?.[0] ?? null
}

function TicketInspectorState({
  idReclamation,
  loading,
  onClose
}: {
  idReclamation: string
  loading: boolean
  onClose: () => void
}) {
  return (
    <>
      <DrawerHeader variant="chrome" className="justify-between">
        <div className="min-w-0 flex-1">
          <DrawerTitle variant="inspector-id" title={idReclamation}>
            {idReclamation}
          </DrawerTitle>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Fermer le dossier"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClose}
        >
          <X aria-hidden />
        </Button>
      </DrawerHeader>
      {loading ? (
        <InspectorSplit
          left={<InspectorTimelineSkeleton variant="ticket" pane="present" />}
          right={<InspectorTimelineSkeleton variant="ticket" pane="history" />}
        />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderX />
            </EmptyMedia>
            <EmptyTitle>Dossier introuvable</EmptyTitle>
            <EmptyDescription>
              La réclamation {idReclamation} n’est plus disponible.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </>
  )
}

/** Contenu de l’Inspector droit ; ActivityPanel fournit le Drawer frère. */
export function ActivityInspectorContent({ url, userLogin }: Props) {
  const { contextTarget, contextOpenToken, closeContextTarget } = useActivityRail()
  const notifications = useNotifications(url, userLogin, Boolean(url) && contextTarget != null)
  const ticketKey =
    contextTarget?.view === 'tickets' ? `${url ?? ''}\u0000${contextTarget.id_reclamation}` : ''
  const [ticketState, setTicketState] = useState<TicketState>({
    key: '',
    ticket: null,
    settled: false
  })

  useEffect(() => {
    if (!contextTarget || contextTarget.view !== 'tickets' || !url) return

    let cancelled = false
    void fetchTicketRow(url, contextTarget.id_reclamation)
      .then((ticket) => {
        if (!cancelled) setTicketState({ key: ticketKey, ticket, settled: true })
      })
      .catch(() => {
        if (!cancelled) setTicketState({ key: ticketKey, ticket: null, settled: true })
      })
    return () => {
      cancelled = true
    }
  }, [contextTarget, ticketKey, url])

  const handlePostActivity = useCallback(
    async (type: string, _statut: string, contenu: string) => {
      if (!contextTarget || contextTarget.view !== 'tickets') return null
      const response = await notifications.createActivity({
        contexte: 'tickets',
        ref: contextTarget.id_reclamation,
        type: type as ActivityType,
        contenu
      })
      return response?.data?.id ?? null
    },
    [contextTarget, notifications]
  )

  const handleSummarizeActivity = useCallback(
    async (content: string) => {
      if (!contextTarget || contextTarget.view !== 'tickets') return null
      const response = await notifications.createActivity({
        contexte: 'tickets',
        ref: contextTarget.id_reclamation,
        type: 'artifact.generated',
        contenu: JSON.stringify({
          version: 2,
          title: 'Point de situation',
          values: { skill: 'ticket.summarize-ticket' },
          note: content
        })
      })
      return response?.data?.id ?? null
    },
    [contextTarget, notifications]
  )

  if (!contextTarget) return null

  if (contextTarget.view === 'repayment') {
    return (
      <ModuleGate entry="repayment">
        <RepaymentActivityDrawer
          url={url}
          userLogin={userLogin}
          tenantId={contextTarget.tenantId}
          idClient={contextTarget.idClient}
          notificationId={contextTarget.activityId}
          sheetOpenToken={contextOpenToken}
          onClose={closeContextTarget}
        />
      </ModuleGate>
    )
  }

  if (contextTarget.view !== 'tickets') return null

  const currentTicketState = !url
    ? { key: ticketKey, ticket: null, settled: true }
    : ticketState.key === ticketKey
      ? ticketState
      : { key: ticketKey, ticket: null, settled: false }

  if (!currentTicketState.settled || !currentTicketState.ticket) {
    return (
      <TicketInspectorState
        idReclamation={contextTarget.id_reclamation}
        loading={!currentTicketState.settled}
        onClose={closeContextTarget}
      />
    )
  }

  return (
    <ModuleGate entry="tickets">
      <TicketReclamationDrawer
        url={url}
        userLogin={userLogin}
        open
        onOpenChange={(next) => {
          if (!next) closeContextTarget()
        }}
        sheetOpenToken={contextOpenToken}
        embedded
        ticket={currentTicketState.ticket}
        initialComposeMode={null}
        highlightActivityId={contextTarget.activityId}
        onPostActivity={handlePostActivity}
        onSummarizeActivity={handleSummarizeActivity}
      />
    </ModuleGate>
  )
}
