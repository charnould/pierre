import { useCallback, useEffect, useMemo, useState } from 'react'

import { useUiSettings } from '@/contexts/UiSettingsContext'
import type { NotificationsApi } from '@/features/activity/hooks/use-notifications'
import { useActivityRail } from '@/features/activity/lib/ActivityRailContext'
import { TicketReclamationDrawer } from '@/features/tickets/components/TicketReclamationDrawer'
import { TicketsTableView } from '@/features/tickets/components/TicketsTableView'
import { useTicketBulkActions } from '@/features/tickets/hooks/use-ticket-bulk-actions'
import { useTicketsNavigation } from '@/features/tickets/hooks/useTicketsNavigation'
import { ticketBucketOptions } from '@/features/tickets/lib/ticket-bucket'
import type { TicketBulkAction } from '@/features/tickets/lib/ticket-bulk-action'
import { ticketTagOptions } from '@/features/tickets/lib/ticket-tags'
import {
  type OpenTicketSheetOptions,
  type TicketComposeMode,
  useTicketsViewData
} from '@/features/tickets/lib/use-tickets-view-data'
import {
  BoardCanvas,
  BoardRefreshButton,
  BoardSelectionToolbar
} from '@/shared/components/board/board-surface'
import { CaseBulkActionDialog } from '@/shared/components/board/case-bulk-action-dialog'
import { ModuleGate } from '@/shared/components/ModuleGate'
import { toast } from '@/shared/components/ui/toast'
import { moduleReady, useCustomizationStatus } from '@/shared/lib/instance-customization'
import type { Tab } from '@/shared/lib/tabs'
import { getTicketId } from '@/shared/lib/ticket-row'
import { cn } from '@/shared/lib/utils'
import type { Settings, TicketRow } from '@/shared/types'

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
  const customizationStatus = useCustomizationStatus()
  const { contextTarget } = useActivityRail()
  const { patchTicketsTable } = useUiSettings()
  const [ticketsRefreshNonce, setTicketsRefreshNonce] = useState(0)
  const [selectedRows, setSelectedRows] = useState<Map<string, TicketRow>>(() => new Map())
  const [loadingBuckets, setLoadingBuckets] = useState<Set<string>>(() => new Set())
  const [seenUrl, setSeenUrl] = useState(settings.url)
  const [bulkOpen, setBulkOpen] = useState(false)
  if (settings.url !== seenUrl) {
    setSeenUrl(settings.url)
    setSelectedRows(new Map())
    setLoadingBuckets(new Set())
    setBulkOpen(false)
  }

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
    (type: string, _statut: string, contenu: string) =>
      postActivity(type as Parameters<typeof postActivity>[0], contenu),
    [postActivity]
  )

  const handleSummarizeActivity = useCallback(
    async (content: string) =>
      postActivity(
        'artifact.generated',
        JSON.stringify({
          version: 2,
          title: 'Point de situation',
          note: content
        })
      ),
    [postActivity]
  )

  const ticketsReady = customizationStatus === 'ready' && moduleReady('tickets')
  const buckets = ticketsReady ? ticketBucketOptions() : []
  const tags = ticketsReady ? ticketTagOptions() : []
  const checkedIds = useMemo(() => new Set(selectedRows.keys()), [selectedRows])
  const refresh = useCallback(() => setTicketsRefreshNonce((nonce) => nonce + 1), [])
  const bulk = useTicketBulkActions({
    url: settings.url,
    userLogin,
    refreshNotifications: () => notifications.refresh(),
    onChanged: refresh
  })

  const onSelectionChange = useCallback((id: string, checked: boolean, row: TicketRow | null) => {
    setSelectedRows((current) => {
      const next = new Map(current)
      if (checked && row) next.set(id, row)
      else next.delete(id)
      return next
    })
  }, [])

  const onLoadingChange = useCallback((bucket: string, loading: boolean) => {
    setLoadingBuckets((current) => {
      if (current.has(bucket) === loading) return current
      const next = new Set(current)
      if (loading) next.add(bucket)
      else next.delete(bucket)
      return next
    })
  }, [])

  const submitBulk = useCallback(
    async (action: TicketBulkAction) => {
      const result = await bulk.run([...selectedRows.values()], action)
      setSelectedRows((current) => {
        const next = new Map<string, TicketRow>()
        for (const id of result.failed) {
          const row = current.get(id)
          if (row) next.set(id, row)
        }
        return next
      })
      setBulkOpen(false)
      const done = result.succeeded.length
      const missed = result.failed.length
      const noun = done > 1 ? 'réclamations' : 'réclamation'
      if (result.stopped) {
        toast.add({
          title: done === 0 ? 'Action interrompue' : `Interrompu après ${done} ${noun}`,
          type: 'error'
        })
        return
      }
      if (missed === 0) {
        toast.add({
          title: `${done} ${noun} traitée${done > 1 ? 's' : ''}`,
          type: 'success'
        })
        return
      }
      toast.add({
        title:
          done === 0
            ? `${missed} réclamation${missed > 1 ? 's' : ''} en échec`
            : `${done} traitée${done > 1 ? 's' : ''}, ${missed} en échec`,
        type: 'error'
      })
    },
    [bulk, selectedRows]
  )

  const countLabel = `${checkedIds.size} réclamation${checkedIds.size > 1 ? 's' : ''}`

  return (
    <div
      data-tab-panel
      className={cn(
        'bg-background relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
        hidden ? 'hidden' : 'flex'
      )}
    >
      <ModuleGate entry="tickets">
        <BoardCanvas
          toolbar={
            checkedIds.size > 0 ? (
              <BoardSelectionToolbar
                count={checkedIds.size}
                noun="réclamation"
                disabled={bulk.running}
                onClear={() => setSelectedRows(new Map())}
                onAct={() => setBulkOpen(true)}
              />
            ) : (
              <BoardRefreshButton loading={loadingBuckets.size > 0} onRefresh={refresh} />
            )
          }
        >
          {(scrollRef) =>
            buckets.map((bucket) => (
              <TicketsTableView
                key={bucket.id}
                hidden={hidden}
                url={settings.url}
                title={bucket.label}
                bucket={bucket.id}
                refreshNonce={ticketsRefreshNonce}
                hasUnread={hasUnread}
                selectedId={selected ? (getTicketId(selected) ?? undefined) : undefined}
                checkedIds={checkedIds}
                selectionDisabled={bulk.running}
                onSelectionChange={onSelectionChange}
                onLoadingChange={onLoadingChange}
                onRowClick={handleRowClick}
                scrollRef={scrollRef}
              />
            ))
          }
        </BoardCanvas>

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
          onCaseStateChange={refresh}
        />
        <CaseBulkActionDialog
          open={bulkOpen}
          countLabel={countLabel}
          description="L’action s’applique à chaque réclamation sélectionnée. Pierre n’envoie rien."
          phaseChoiceLabel="Changer le panier"
          phaseFieldLabel="Panier"
          phasePlaceholder="Choisir un panier"
          phases={buckets}
          tags={tags}
          progress={bulk.progress}
          progressLabel={(current) => `Réclamation ${current.index} sur ${current.total}`}
          pierreHint="Un résultat distinct est enregistré dans chaque réclamation."
          onClose={() => setBulkOpen(false)}
          onStop={bulk.stop}
          onSubmit={submitBulk}
        />
      </ModuleGate>
    </div>
  )
}
