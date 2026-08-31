import { useCallback, useEffect, useState } from 'react'

import { useRegisterNavigationHandlers } from '@/contexts/NavigationHistoryContext'
import { useUiSettings } from '@/contexts/UiSettingsContext'
import type { NotificationsApi } from '@/features/activity/hooks/use-notifications'
import { AutomationDetailEmpty } from '@/features/automations/components/AutomationDetailEmpty'
import { AutomationForm } from '@/features/automations/components/AutomationForm'
import { AutomationFormDialog } from '@/features/automations/components/AutomationFormDialog'
import { AutomationsList } from '@/features/automations/components/AutomationsList'
import { useAutomationsListFilters } from '@/features/automations/hooks/useAutomationsListFilters'
import {
  isTicketReplyAutomation,
  recordToAutomation,
  type Automation,
  type ReportAutomation,
  type TicketReplyAutomation
} from '@/features/automations/lib/automation-types'
import { openAutomationRun } from '@/features/automations/lib/open-automation-run'
import { toast } from '@/shared/components/ui/toast'
import { cn } from '@/shared/lib/utils'
import type { CreateAutomationBody, PatchAutomationBody } from '@/shared/types/automations'
import type { Settings } from '@/shared/types/settings'

interface Props {
  hidden: boolean
  agentName: string
  userLogin: string
  settings: Settings
  notifications?: NotificationsApi
}

function automationsSheetTitle(isCreatingNew: boolean): string {
  return isCreatingNew ? 'Créer une automatisation' : "Modifier l'automatisation"
}

export function AutomationsView({
  hidden,
  agentName,
  userLogin,
  settings,
  notifications: _notifications
}: Props) {
  const { settings: settingsUi, loading } = useUiSettings()
  const panelReady = !loading && !hidden

  const [automations, setAutomations] = useState<Automation[]>([])
  const [selectedAutomationId, setSelectedAutomationId] = useState<string | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)

  const sheetOpen = isCreatingNew || selectedAutomationId !== null
  const selectedAutomation = automations.find((a) => a.id === selectedAutomationId) ?? null
  const { query, setQuery, sortKey, setSortKey, normalizedQuery, sortedAutomations } =
    useAutomationsListFilters(automations)

  const refresh = useCallback(async () => {
    if (!settings.url || !window.api?.getAutomations || !userLogin) {
      return
    }
    const res = await window.api.getAutomations({ url: settings.url })
    if (!res) return
    setAutomations(res.data.map((row) => recordToAutomation(row, userLogin)))
  }, [settings.url, userLogin])

  useEffect(() => {
    if (hidden || sheetOpen || !settings.url || !window.api?.getAutomations || !userLogin) return
    const url = settings.url
    const login = userLogin
    void window.api.getAutomations({ url }).then((res) => {
      if (!res) return
      setAutomations(res.data.map((row) => recordToAutomation(row, login)))
    })
    const id = window.setInterval(() => {
      void refresh()
    }, 15_000)
    return () => window.clearInterval(id)
  }, [hidden, refresh, settings.url, sheetOpen, userLogin])

  useRegisterNavigationHandlers('automations', {
    getSnapshot: () =>
      selectedAutomationId
        ? {
            activityTarget: {
              view: 'automations',
              automationId: selectedAutomationId
            }
          }
        : {},
    applySnapshot: (snapshot) => {
      const target = snapshot.activityTarget
      if (target?.view !== 'automations') return
      setSelectedAutomationId(target.automationId)
      setIsCreatingNew(false)
    }
  })

  if (
    selectedAutomationId !== null &&
    automations.length > 0 &&
    !automations.some((automation) => automation.id === selectedAutomationId)
  ) {
    setSelectedAutomationId(null)
  }

  function closeSheet() {
    setSelectedAutomationId(null)
    setIsCreatingNew(false)
  }

  function handleSelectAutomation(automation: Automation) {
    setSelectedAutomationId(automation.id)
    setIsCreatingNew(false)
  }

  function handleNewAutomation() {
    setSelectedAutomationId(null)
    setIsCreatingNew(true)
  }

  async function handleSave(data: Partial<Automation>) {
    if (!settings.url || !window.api) return

    if (selectedAutomationId && !isCreatingNew) {
      const patch: PatchAutomationBody = {
        name: data.name,
        description: data.description,
        mentions: data.mentions,
        frequency: data.frequency,
        frequencyDay: data.frequencyDay,
        frequencyTime: data.frequencyTime
      }
      if (data.type === 'report' || (!data.type && selectedAutomation?.type === 'report')) {
        if ('prompt' in data) patch.prompt = (data as Partial<ReportAutomation>).prompt
        if ('maxReports' in data) patch.maxReports = (data as Partial<ReportAutomation>).maxReports
      } else {
        const reply = data as Partial<TicketReplyAutomation>
        if (reply.channel) patch.channel = reply.channel
        if (reply.ticketFilters) patch.ticketFilters = reply.ticketFilters
        if (reply.maxItems !== undefined) patch.maxItems = reply.maxItems
      }
      const res = await window.api.patchAutomation({
        url: settings.url,
        id: selectedAutomationId,
        patch
      })
      if (!res) {
        toast.add({ title: 'Enregistrement impossible', type: 'error' })
        return
      }
      await refresh()
      closeSheet()
      toast.add({ title: 'Automatisation mise à jour', type: 'success' })
      return
    }

    const body: CreateAutomationBody =
      data.type === 'ticket_reply'
        ? {
            type: 'ticket_reply',
            name: data.name ?? 'Nouvelle automatisation',
            description: data.description ?? '',
            mentions: data.mentions ?? [],
            frequency: data.frequency ?? 'weekly',
            frequencyDay: data.frequencyDay,
            frequencyTime: data.frequencyTime ?? '08:00',
            channel: (data as Partial<TicketReplyAutomation>).channel ?? 'email',
            ticketFilters: (data as Partial<TicketReplyAutomation>).ticketFilters ?? {
              rules: []
            },
            maxItems: (data as Partial<TicketReplyAutomation>).maxItems ?? 20
          }
        : {
            type: 'report',
            name: data.name ?? 'Nouvelle automatisation',
            description: data.description ?? '',
            mentions: data.mentions ?? [],
            frequency: data.frequency ?? 'weekly',
            frequencyDay: data.frequencyDay,
            frequencyTime: data.frequencyTime ?? '08:00',
            prompt: (data as Partial<ReportAutomation>).prompt ?? '',
            maxReports: (data as Partial<ReportAutomation>).maxReports ?? 6
          }

    const res = await window.api.createAutomation({ url: settings.url, ...body })
    if (!res) {
      toast.add({ title: 'Création impossible', type: 'error' })
      return
    }
    await refresh()
    closeSheet()
    toast.add({ title: 'Automatisation créée', type: 'success' })
  }

  async function handleTogglePause(automationId: string) {
    if (!settings.url || !window.api?.patchAutomation) return
    const current = automations.find((a) => a.id === automationId)
    if (!current) return
    const res = await window.api.patchAutomation({
      url: settings.url,
      id: automationId,
      patch: { status: current.status === 'paused' ? 'scheduled' : 'paused' }
    })
    if (!res) {
      toast.add({ title: 'Mise en pause impossible', type: 'error' })
      return
    }
    await refresh()
    closeSheet()
  }

  async function handleDelete() {
    if (!selectedAutomationId || !settings.url || !window.api?.deleteAutomation) return
    const res = await window.api.deleteAutomation({
      url: settings.url,
      id: selectedAutomationId
    })
    if (!res) {
      toast.add({ title: 'Suppression impossible', type: 'error' })
      return
    }
    closeSheet()
    await refresh()
    toast.add({ title: 'Automatisation supprimée', type: 'success' })
  }

  async function handleTogglePin(automation: Automation) {
    if (!settings.url || !window.api) return
    const res = automation.pinned
      ? await window.api.unpinAutomation({ url: settings.url, id: automation.id })
      : await window.api.pinAutomation({ url: settings.url, id: automation.id })
    if (!res) {
      toast.add({ title: 'Épinglage impossible', type: 'error' })
      return
    }
    await refresh()
  }

  async function handleLaunch() {
    if (!selectedAutomationId || !settings.url || !window.api?.runAutomation) return
    const res = await window.api.runAutomation({
      url: settings.url,
      id: selectedAutomationId
    })
    if (!res) {
      toast.add({ title: 'Exécution impossible', type: 'error' })
      return
    }
    await refresh()
    closeSheet()
    toast.add({
      title: isTicketReplyAutomation(recordToAutomation(res.data, userLogin))
        ? 'Brouillons disponibles dans les notifications'
        : 'Rapport disponible dans les notifications',
      type: 'success'
    })
  }

  function renderDialogContent() {
    if (isCreatingNew || selectedAutomation?.isCreator) {
      return (
        <AutomationForm
          key={selectedAutomation?.id ?? 'new'}
          agentName={agentName}
          url={settings.url}
          uiSettings={settingsUi}
          automation={isCreatingNew ? undefined : (selectedAutomation ?? undefined)}
          onCancel={closeSheet}
          onSave={(data) => void handleSave(data)}
          onLaunch={selectedAutomation?.isCreator ? () => void handleLaunch() : undefined}
          onTogglePause={
            selectedAutomation?.isCreator && selectedAutomationId
              ? () => void handleTogglePause(selectedAutomationId)
              : undefined
          }
          onDelete={selectedAutomation?.isCreator ? () => void handleDelete() : undefined}
        />
      )
    }
    if (selectedAutomation) {
      return (
        <AutomationDetailEmpty variant="collaborator" automationName={selectedAutomation.name} />
      )
    }
    return null
  }

  return (
    <div
      data-tab-panel
      className={cn(
        'relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background',
        hidden ? 'hidden' : 'flex'
      )}
    >
      {panelReady ? (
        <div className="flex min-h-0 w-full min-w-0 flex-1 scroll-pb-4 flex-col overflow-x-hidden overflow-y-auto overscroll-contain pb-6">
          <AutomationsList
            automations={sortedAutomations}
            url={settings.url}
            agentName={agentName}
            query={query}
            normalizedQuery={normalizedQuery}
            onQueryChange={setQuery}
            sortKey={sortKey}
            onSortKeyChange={setSortKey}
            selectedAutomationId={selectedAutomationId}
            onSelectAutomation={handleSelectAutomation}
            onTogglePin={(automation) => void handleTogglePin(automation)}
            onNewAutomation={handleNewAutomation}
            onOpenRun={openAutomationRun}
          />
        </div>
      ) : null}

      <AutomationFormDialog
        open={sheetOpen}
        title={automationsSheetTitle(isCreatingNew)}
        onClose={closeSheet}
      >
        {renderDialogContent()}
      </AutomationFormDialog>
    </div>
  )
}
