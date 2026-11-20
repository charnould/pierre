import { DEFAULT_AUTOMATION_SCHEDULE } from '@pierre/shared/schedule'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useRegisterNavigationHandlers } from '@/contexts/NavigationHistoryContext'
import { useUiSettings } from '@/contexts/UiSettingsContext'
import type { NotificationsApi } from '@/features/activity/hooks/use-notifications'
import { AutomationDetailEmpty } from '@/features/automations/components/AutomationDetailEmpty'
import { AutomationForm } from '@/features/automations/components/AutomationForm'
import { AutomationFormDialog } from '@/features/automations/components/AutomationFormDialog'
import { AutomationsList } from '@/features/automations/components/AutomationsList'
import { useAutomationsListFilters } from '@/features/automations/hooks/useAutomationsListFilters'
import {
  type Automation,
  recordToAutomation,
  type ReportAutomation
} from '@/features/automations/lib/automation-types'
import { openAutomationRun } from '@/features/automations/lib/open-automation-run'
import { ModuleGate } from '@/shared/components/ModuleGate'
import { toast } from '@/shared/components/ui/toast'
import { ipcErrorMessage, isIpcData } from '@/shared/lib/ipc-error'
import { cn } from '@/shared/lib/utils'
import type { CreateAutomationBody, PatchAutomationBody } from '@/shared/types/automations'
import type { Settings } from '@/shared/types/settings'

interface Props {
  hidden: boolean
  agentName: string
  userLogin: string
  isAdministrator?: boolean
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
  isAdministrator = false,
  settings,
  notifications: _notifications
}: Props) {
  const { settings: settingsUi, loading } = useUiSettings()
  const panelReady = !loading && !hidden

  const [automations, setAutomations] = useState<Automation[]>([])
  const [selectedAutomationId, setSelectedAutomationId] = useState<string | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const stoppedRunIdsRef = useRef(new Set<string>())

  const sheetOpen = isCreatingNew || selectedAutomationId !== null
  const hasRunning = automations.some((a) => a.status === 'running')
  const selectedAutomation = automations.find((a) => a.id === selectedAutomationId) ?? null
  const { query, setQuery, sortKey, setSortKey, normalizedQuery, sortedAutomations } =
    useAutomationsListFilters(automations)

  const refresh = useCallback(async () => {
    if (!settings.url || !window.api?.getAutomations || !userLogin) {
      return
    }
    const res = await window.api.getAutomations({ url: settings.url })
    if (!res) return
    setAutomations(res.data.map((row) => recordToAutomation(row, userLogin, isAdministrator)))
  }, [isAdministrator, settings.url, userLogin])

  useEffect(() => {
    if (hidden || sheetOpen || !settings.url || !window.api?.getAutomations || !userLogin) return
    const url = settings.url
    const login = userLogin
    void window.api.getAutomations({ url }).then((res) => {
      if (!res) return
      setAutomations(res.data.map((row) => recordToAutomation(row, login, isAdministrator)))
    })
    const id = window.setInterval(
      () => {
        void refresh()
      },
      hasRunning ? 3_000 : 15_000
    )
    return () => window.clearInterval(id)
  }, [hasRunning, hidden, isAdministrator, refresh, settings.url, sheetOpen, userLogin])

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
        schedule: data.schedule
      }
      if ('prompt' in data) patch.prompt = (data as Partial<ReportAutomation>).prompt
      if ('maxReports' in data) patch.maxReports = (data as Partial<ReportAutomation>).maxReports
      const res = await window.api.patchAutomation({
        url: settings.url,
        id: selectedAutomationId,
        patch
      })
      const refused = ipcErrorMessage(res, 'Enregistrement impossible')
      if (refused) {
        toast.add({ title: refused, type: 'error' })
        return
      }
      await refresh()
      closeSheet()
      toast.add({ title: 'Automatisation mise à jour', type: 'success' })
      return
    }

    const body: CreateAutomationBody = {
      type: 'report',
      name: data.name ?? 'Nouvelle automatisation',
      description: data.description ?? '',
      mentions: data.mentions ?? [],
      schedule: data.schedule ?? DEFAULT_AUTOMATION_SCHEDULE,
      prompt: (data as Partial<ReportAutomation>).prompt ?? '',
      maxReports: (data as Partial<ReportAutomation>).maxReports ?? 6
    }

    const res = await window.api.createAutomation({ url: settings.url, ...body })
    const refused = ipcErrorMessage(res, 'Création impossible')
    if (refused) {
      toast.add({ title: refused, type: 'error' })
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
    const refused = ipcErrorMessage(res, 'Mise en pause impossible')
    if (refused) {
      toast.add({ title: refused, type: 'error' })
      return
    }
    await refresh()
    closeSheet()
  }

  async function handleDelete() {
    if (!selectedAutomationId || !settings.url || !window.api?.deleteAutomation) return
    stoppedRunIdsRef.current.add(selectedAutomationId)
    const res = await window.api.deleteAutomation({
      url: settings.url,
      id: selectedAutomationId
    })
    const refused = ipcErrorMessage(res, 'Suppression impossible')
    if (refused) {
      stoppedRunIdsRef.current.delete(selectedAutomationId)
      toast.add({ title: refused, type: 'error' })
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
    const refused = ipcErrorMessage(res, 'Épinglage impossible')
    if (refused) {
      toast.add({ title: refused, type: 'error' })
      return
    }
    await refresh()
  }

  async function handleStopRun(automationId: string) {
    if (!settings.url || !window.api?.stopAutomationRun) return
    stoppedRunIdsRef.current.add(automationId)
    const res = await window.api.stopAutomationRun({
      url: settings.url,
      id: automationId
    })
    const refused = ipcErrorMessage(res, 'Interruption impossible')
    if (refused) {
      stoppedRunIdsRef.current.delete(automationId)
      toast.add({ title: refused, type: 'error' })
      return
    }
    await refresh()
    toast.add({ title: 'Génération interrompue', type: 'success' })
  }

  async function handleLaunch() {
    const launchedId = selectedAutomationId
    if (!launchedId || !settings.url || !window.api?.runAutomation) return
    stoppedRunIdsRef.current.delete(launchedId)
    setAutomations((prev) =>
      prev.map((a) => (a.id === launchedId ? { ...a, status: 'running' } : a))
    )
    const res = await window.api.runAutomation({
      url: settings.url,
      id: launchedId
    })
    const wasStopped = stoppedRunIdsRef.current.delete(launchedId)
    await refresh()
    if (wasStopped) return
    if (!isIpcData(res)) {
      toast.add({
        title: ipcErrorMessage(res, 'Exécution impossible') ?? 'Exécution impossible',
        type: 'error'
      })
      return
    }
    setSelectedAutomationId((current) => (current === launchedId ? null : current))
    if (res.data.lastRunStatus === 'error') {
      toast.add({ title: 'Exécution impossible', type: 'error' })
      return
    }
    toast.add({
      title: 'Rapport disponible dans les notifications',
      type: 'success'
    })
  }

  function renderDialogContent() {
    if (isCreatingNew || selectedAutomation?.canManage) {
      return (
        <AutomationForm
          key={selectedAutomation?.id ?? 'new'}
          agentName={agentName}
          url={settings.url}
          userLogin={userLogin}
          uiSettings={settingsUi}
          automation={isCreatingNew ? undefined : (selectedAutomation ?? undefined)}
          onCancel={closeSheet}
          onSave={(data) => void handleSave(data)}
          onLaunch={selectedAutomation?.canManage ? () => void handleLaunch() : undefined}
          onStopRun={
            selectedAutomation?.canManage && selectedAutomationId
              ? () => void handleStopRun(selectedAutomationId)
              : undefined
          }
          onTogglePause={
            selectedAutomation?.canManage && selectedAutomationId
              ? () => void handleTogglePause(selectedAutomationId)
              : undefined
          }
          onDelete={selectedAutomation?.canManage ? () => void handleDelete() : undefined}
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
    <ModuleGate entry="automations" hidden={hidden}>
      <div
        data-tab-panel
        className={cn(
          'bg-background relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
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
              onStopRun={(automation) => void handleStopRun(automation.id)}
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
    </ModuleGate>
  )
}
