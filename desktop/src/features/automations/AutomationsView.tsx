import { MousePointerClick } from 'lucide-react'
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useUiSettings } from '@/contexts/UiSettingsContext'
import { AutomationForm } from '@/features/automations/components/AutomationForm'
import { AutomationReport } from '@/features/automations/components/AutomationReport'
import { AUTO_DETAIL_CROSSFADE } from '@/features/automations/components/automations-chrome'
import { AutomationsList } from '@/features/automations/components/AutomationsList'
import {
  MOCK_AUTOMATIONS,
  trimRunsToLimit,
  type Automation
} from '@/features/automations/components/mock-data'
import {
  automationMaxRuns,
  isReportAutomation,
  isTicketReplyAutomation,
  type ReportAutomation,
  type TicketReplyAutomation,
  type TicketReplyRun
} from '@/features/automations/lib/automation-types'
import { Card, CardBody } from '@/shared/components/ui/card'
import { DeskHandle, DeskPane, DeskShell, DeskSplit } from '@/shared/components/ui/desk-shell'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { useDebouncedAutomationsPatch } from '@/shared/hooks/useDebouncedAutomationsPatch'
import {
  AUTOMATIONS_PANEL_DETAIL,
  AUTOMATIONS_PANEL_LIST,
  AUTOMATIONS_SPLIT_DEFAULT_LIST,
  defaultAutomationsPanelLayout,
  splitFromAutomationsLayout
} from '@/shared/lib/ui-settings/automations-panel'
import { cn } from '@/shared/lib/utils'
import type { Settings } from '@/shared/types/settings'

import '@/features/automations/styles/auto-report-markdown.css'

type RightPanelMode = 'report' | 'form'

interface Props {
  hidden: boolean
  agentName: string
  settings: Settings
}

export function AutomationsView({ hidden, agentName, settings }: Props) {
  const reduceMotion = useReducedMotion()
  const { settings: settingsUi, loading } = useUiSettings()
  const { patch: patchAutomations, cancel: cancelAutomationsPatch } = useDebouncedAutomationsPatch({
    delayMs: 400
  })

  const savedSplitRef = useRef(settingsUi.automations?.panelSplit)
  useEffect(() => {
    savedSplitRef.current = settingsUi.automations?.panelSplit
  }, [settingsUi.automations?.panelSplit])

  useEffect(() => {
    if (loading) cancelAutomationsPatch()
  }, [loading, cancelAutomationsPatch])

  const panelSplit = settingsUi.automations?.panelSplit
  const panelGroupKey = panelSplit?.listPercent ?? AUTOMATIONS_SPLIT_DEFAULT_LIST
  const defaultLayout = defaultAutomationsPanelLayout(panelSplit)
  const panelReady = !loading && !hidden

  const handleLayoutChanged = useCallback(
    (layout: Record<string, number>) => {
      if (!panelReady) return
      const nextSplit = splitFromAutomationsLayout(layout)
      if (savedSplitRef.current?.listPercent === nextSplit.listPercent) return
      savedSplitRef.current = nextSplit
      patchAutomations({ panelSplit: nextSplit })
    },
    [panelReady, patchAutomations]
  )

  const [automations, setAutomations] = useState<Automation[]>(MOCK_AUTOMATIONS)

  const [selectedAutomationId, setSelectedAutomationId] = useState<string | null>(null)
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('report')
  const [editingAutomationId, setEditingAutomationId] = useState<string | null>(null)

  useEffect(() => {
    if (
      selectedAutomationId !== null &&
      !automations.some((automation) => automation.id === selectedAutomationId)
    ) {
      setSelectedAutomationId(null)
    }
  }, [automations, selectedAutomationId])

  const selectedAutomation = automations.find((a) => a.id === selectedAutomationId) ?? null
  const editingAutomation = automations.find((a) => a.id === editingAutomationId) ?? null

  function handleSelectAutomation(automation: Automation) {
    setSelectedAutomationId(automation.id)
    setRightPanelMode('report')
    setEditingAutomationId(null)
  }

  function handleClearSelection() {
    setSelectedAutomationId(null)
    setRightPanelMode('report')
    setEditingAutomationId(null)
  }

  function handleEdit(automation: Automation) {
    setEditingAutomationId(automation.id)
    setRightPanelMode('form')
  }

  function handleNewAutomation() {
    setEditingAutomationId(null)
    setRightPanelMode('form')
  }

  function handleCancel() {
    setRightPanelMode('report')
    setEditingAutomationId(null)
  }

  function handleSave(data: Partial<Automation>) {
    if (editingAutomationId) {
      setAutomations((prev) =>
        prev.map((a) => {
          if (a.id !== editingAutomationId) return a
          if (isReportAutomation(a) && data.type !== 'ticket_reply') {
            return { ...a, ...data } as ReportAutomation
          }
          if (isTicketReplyAutomation(a) && data.type !== 'report') {
            return { ...a, ...data } as TicketReplyAutomation
          }
          return { ...a, ...data } as Automation
        })
      )
    } else if (data.type === 'ticket_reply') {
      const newAuto: TicketReplyAutomation = {
        type: 'ticket_reply',
        id: `auto-${Date.now()}`,
        name: data.name ?? 'Nouvelle automatisation',
        description: data.description ?? '',
        status: 'scheduled',
        owner: 'gensel',
        collaborators: data.collaborators ?? [],
        isCreator: true,
        runs: [],
        skillId: 'ticket.answer-ticket',
        ticketFilters: data.ticketFilters ?? { rules: [] },
        maxRuns: data.maxRuns ?? 6,
        frequency: data.frequency ?? 'weekly',
        frequencyDay: data.frequencyDay,
        frequencyTime: data.frequencyTime ?? '08:00',
        nextRunDate: undefined
      }
      setAutomations((prev) => [newAuto, ...prev])
      setSelectedAutomationId(newAuto.id)
    } else {
      const newAuto: ReportAutomation = {
        type: 'report',
        id: `auto-${Date.now()}`,
        name: data.name ?? 'Nouvelle automatisation',
        description: data.description ?? '',
        status: 'scheduled',
        owner: 'gensel',
        collaborators: data.collaborators ?? [],
        isCreator: true,
        runs: [],
        maxReports: data.maxReports ?? 6,
        frequency: data.frequency ?? 'weekly',
        frequencyDay: data.frequencyDay,
        frequencyTime: data.frequencyTime ?? '08:00',
        prompt: data.prompt ?? '',
        nextRunDate: undefined
      }
      setAutomations((prev) => [newAuto, ...prev])
      setSelectedAutomationId(newAuto.id)
    }
    setRightPanelMode('report')
    setEditingAutomationId(null)
  }

  function handleTogglePause() {
    if (!editingAutomationId) return
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === editingAutomationId
          ? { ...a, status: a.status === 'paused' ? 'scheduled' : 'paused' }
          : a
      )
    )
  }

  function handleDelete() {
    if (!editingAutomationId) return
    const remaining = automations.filter((a) => a.id !== editingAutomationId)
    setAutomations(remaining)
    setSelectedAutomationId((current) => (current === editingAutomationId ? null : current))
    setRightPanelMode('report')
    setEditingAutomationId(null)
  }

  function handleLaunch() {
    if (!editingAutomationId) return
    const now = new Date().toISOString()
    setAutomations((prev) =>
      prev.map((a) => {
        if (a.id !== editingAutomationId) return a
        if (isTicketReplyAutomation(a)) {
          const newRun: TicketReplyRun = {
            id: `run-${a.id}-${Date.now()}`,
            automationId: a.id,
            date: now,
            summary: { total: 3, generated: 2, skipped: 1, errors: 0 },
            tickets: [
              { id_reclamation: 'REQ-MOCK-1', outcome: 'generated' },
              { id_reclamation: 'REQ-MOCK-2', outcome: 'generated' },
              { id_reclamation: 'REQ-MOCK-3', outcome: 'skipped_existing_draft' }
            ]
          }
          return {
            ...a,
            status: 'success' as const,
            lastRunDate: now,
            runs: trimRunsToLimit([newRun, ...a.runs], a.maxRuns)
          }
        }
        const newRun = {
          id: `run-${a.id}-${Date.now()}`,
          automationId: a.id,
          date: now,
          report: `# ${a.name}\n\nGénération manuelle du ${new Date(now).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.\n\n_Rapport placeholder — contenu à générer par l'agent._`
        }
        return {
          ...a,
          status: 'success' as const,
          lastRunDate: now,
          runs: trimRunsToLimit([newRun, ...a.runs], automationMaxRuns(a))
        }
      })
    )
    setRightPanelMode('report')
    setEditingAutomationId(null)
    setSelectedAutomationId(editingAutomationId)
  }

  const detailEmpty = (
    <div className="desk-output-panel">
      <Card variant="report">
        <CardBody inset="report">
          <Empty className="desk-output-empty">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MousePointerClick />
              </EmptyMedia>
              <EmptyTitle>Aucune automatisation sélectionnée</EmptyTitle>
              <EmptyDescription>
                {automations.length === 0
                  ? 'Créez une automatisation pour commencer.'
                  : "Sélectionnez une automatisation dans la liste pour l'afficher."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardBody>
      </Card>
    </div>
  )

  return (
    <div
      className={cn(
        'tab-panel relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background',
        hidden ? 'hidden' : 'flex'
      )}
    >
      {panelReady ? (
        <DeskShell className="min-h-0 flex-1">
          <DeskSplit
            key={panelGroupKey}
            id="automations-view"
            orientation="horizontal"
            defaultLayout={defaultLayout}
            onLayoutChanged={handleLayoutChanged}
          >
            <DeskPane id={AUTOMATIONS_PANEL_LIST} minSize="20%" maxSize="45%">
              <div className="desk-list-panel">
                <AutomationsList
                  automations={automations}
                  selectedAutomationId={selectedAutomationId}
                  uiSettings={settingsUi}
                  onSelectAutomation={handleSelectAutomation}
                  onClearSelection={handleClearSelection}
                  onEdit={handleEdit}
                  onNewAutomation={handleNewAutomation}
                />
              </div>
            </DeskPane>

            <DeskHandle />

            <DeskPane id={AUTOMATIONS_PANEL_DETAIL} minSize="40%">
              <MotionConfig
                reducedMotion={reduceMotion ? 'always' : 'never'}
                transition={AUTO_DETAIL_CROSSFADE}
              >
                {rightPanelMode === 'form' ? (
                  <AutomationForm
                    agentName={agentName}
                    url={settings.url}
                    uiSettings={settingsUi}
                    automation={editingAutomation ?? undefined}
                    onCancel={handleCancel}
                    onSave={handleSave}
                    onLaunch={editingAutomation ? handleLaunch : undefined}
                    onTogglePause={editingAutomation ? handleTogglePause : undefined}
                    onDelete={editingAutomation ? handleDelete : undefined}
                  />
                ) : selectedAutomation ? (
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                      key={selectedAutomation.id}
                      className="flex h-full min-h-0 min-w-0 flex-1 flex-col"
                      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                      transition={reduceMotion ? { duration: 0 } : AUTO_DETAIL_CROSSFADE}
                    >
                      <AutomationReport automation={selectedAutomation} />
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  detailEmpty
                )}
              </MotionConfig>
            </DeskPane>
          </DeskSplit>
        </DeskShell>
      ) : null}
    </div>
  )
}
