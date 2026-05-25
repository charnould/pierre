import { Star } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'

import { useNavigationHistory } from '@/contexts/NavigationHistoryContext'
import { fetchConfig } from '@/features/settings/SettingsView'
import { DraftFeedbackDialog } from '@/features/tickets/components/DraftFeedbackDialog'
import { TicketContextColumn } from '@/features/tickets/components/TicketContextColumn'
import { TicketOutputPanel } from '@/features/tickets/components/TicketOutputPanel'
import { TicketSkillChoiceCards } from '@/features/tickets/components/TicketSkillChoiceCards'
import { TicketsTableView } from '@/features/tickets/components/TicketsTableView'
import { useTicketDraftLifecycle } from '@/features/tickets/hooks/useTicketDraftLifecycle'
import { useTicketsNavigation } from '@/features/tickets/hooks/useTicketsNavigation'
import {
  generateTicketIds,
  needsGeneratedTicketIds
} from '@/features/tickets/lib/generate-ticket-ids'
import {
  formatToWire,
  isAnswerFormat,
  skillHasDocxTemplate,
  ticketSkillKeyActions,
  type TicketSkillKey
} from '@/features/tickets/lib/knowledge-skills'
import { persistTicketReclamation } from '@/features/tickets/lib/persist-ticket-reclamation'
import {
  ArtifactToolbarActions,
  mergeUniqueFiles,
  type FileEntry
} from '@/features/workflow/components/WorkflowPanelChrome'
import { useWorkflowDeskSplit } from '@/features/workflow/hooks/useWorkflowDeskSplit'
import { useWorkflowPanel } from '@/features/workflow/hooks/useWorkflowPanel'
import { readFileBuffer } from '@/features/workflow/lib/read-file-buffer'
import { useWorkflowKeyboard } from '@/features/workflow/lib/workflow-keyboard'
import {
  buildAnswerPayload,
  serializeWorkflowPayload
} from '@/features/workflow/lib/workflow-payload'
import { Button } from '@/shared/components/ui/button'
import {
  DeskContent,
  DeskHandle,
  DeskPane,
  DeskShell,
  DeskSplit
} from '@/shared/components/ui/desk-shell'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { captureReasoningForSkill } from '@/shared/hooks/useSkillConfigs'
import type { TicketsNavigationState } from '@/shared/lib/navigation-snapshot'
import { releaseConversationVm } from '@/shared/lib/release-conversation-vm'
import type { Tab } from '@/shared/lib/tabs'
import { getTicketCellText } from '@/shared/lib/ticket-row'
import { WORKFLOW_PANEL_CONTEXTE, WORKFLOW_PANEL_OUTPUT } from '@/shared/lib/ui-settings/schema'
import { cn } from '@/shared/lib/utils'
import type { TicketRow } from '@/shared/types'
import type { Settings } from '@/shared/types'

interface Props {
  hidden: boolean
  settings: Settings
  onNavigate: (tab: Tab) => void
  agentName: string
}

const TICKETS_SPLIT_KEY = 'ticketsOutputSplit' as const

export function TicketsView({ hidden, settings, onNavigate, agentName }: Props) {
  const [ticketNumber, setTicketNumber] = useState('')
  const [tenantNumber, setTenantNumber] = useState('')
  const [message, setMessage] = useState('')
  const [context, setContext] = useState('')
  const [ticketFormat, setTicketFormat] = useState<TicketSkillKey>('ticketReplyEmail')
  const [files, setFiles] = useState<FileEntry[]>([])
  const [dragging, setDragging] = useState(false)
  const [copiedR, setCopiedR] = useState(false)
  const [ticketUrlPattern, setTicketUrlPattern] = useState<string | undefined>()
  const [ticketsRefreshNonce, setTicketsRefreshNonce] = useState(0)
  const { navigate } = useNavigationHistory()

  const wire = formatToWire(ticketFormat)
  const id_skill = wire.id_skill
  const channel = wire.channel

  useEffect(() => {
    const url = settings.url
    if (!url) {
      setTicketUrlPattern(undefined)
      return
    }
    void fetchConfig(url).then((config) => setTicketUrlPattern(config?.ticket_url_pattern))
  }, [settings.url])

  const bumpTicketsRefresh = useCallback(() => {
    setTicketsRefreshNonce((n) => n + 1)
  }, [])

  const resetFormFields = useCallback(() => {
    setTicketNumber('')
    setTenantNumber('')
    setMessage('')
    setContext('')
    setTicketFormat('ticketReplyEmail')
    setFiles([])
    setCopiedR(false)
  }, [])

  const {
    state,
    convId,
    generate,
    patchState,
    copyText,
    downloadDocx,
    reasoningUi,
    skillConfigs,
    step,
    setStep,
    isOutput,
    clearOutput,
    resetConvId,
    goHome: panelGoHome,
    cancel
  } = useWorkflowPanel({
    url: settings.url,
    id_skill,
    onNavigate,
    resetForm: resetFormFields,
    onErrorReturnToForm: null
  })

  const { output, subject, reasoning, isStreaming, isReasoningPhase, reasoningCapture, errMsg } =
    state
  const showReasoningForRun =
    reasoningCapture && (reasoningUi.showReasoningTokens || Object.keys(skillConfigs).length === 0)
  const hasOutputText = !!output.trim()

  const draft = useTicketDraftLifecycle({
    url: settings.url,
    ticketNumber,
    ticketFormat,
    setTicketFormat,
    id_skill,
    channel,
    isOutput,
    isStreaming,
    hasOutputText,
    output,
    subject,
    patchState,
    clearOutput,
    onRefreshTable: bumpTicketsRefresh
  })

  const {
    generationKey,
    bumpGenerationKey,
    draftIdSkills,
    setDraftIdSkills,
    setDraftAnswerChannel,
    draftAnswerChannel,
    draftRevision,
    draftVariants,
    draftAutomationId,
    draftFeedback,
    feedbackDialogOpen,
    setFeedbackDialogOpen,
    feedbackSaving,
    pendingDraftIdSkillRef,
    hasPersistedDraft,
    resetDraftFormState,
    clearOutputAndDrafts,
    applyDraftRevision,
    enterEditedFromGenerated,
    saveEditedDraft,
    handleOutputChange,
    loadTicketDraft,
    recordGenerationDraft,
    handleSaveFeedback
  } = draft

  const goHome = useCallback(() => {
    panelGoHome()
    resetDraftFormState()
  }, [panelGoHome, resetDraftFormState])

  useTicketsNavigation({
    step,
    setStep,
    ticketNumber,
    tenantNumber,
    message,
    context,
    ticketFormat,
    setTicketNumber,
    setTenantNumber,
    setMessage,
    setContext,
    setTicketFormat,
    draftRevision,
    draftVariants,
    url: settings.url,
    convId,
    cancel,
    resetConvId,
    clearOutputAndDrafts,
    loadAvailableTicketDraft: draft.loadAvailableTicketDraft,
    saveEditedDraft,
    pendingDraftIdSkillRef
  })

  const { panelReady, panelGroupKey, defaultLayout, handleLayoutChanged } = useWorkflowDeskSplit({
    splitKey: TICKETS_SPLIT_KEY,
    hidden,
    panelActive: isOutput
  })

  useEffect(() => {
    if (!hidden || step !== 'output') return
    cancel()
    releaseConversationVm(settings.url, convId.current)
    setStep('form')
  }, [hidden, step, setStep, cancel, settings.url, convId])

  const openTicketsOutput = useCallback(
    (ticketsState: Omit<TicketsNavigationState, 'step'>) => {
      navigate({
        tab: 'tickets',
        tickets: { ...ticketsState, step: 'output' }
      })
    },
    [navigate]
  )

  const handleTicketNumberBlur = useCallback(async () => {
    const trimmed = ticketNumber.trim()
    if (!trimmed || !settings.url) return
    const res = await window.api.getTickets({
      url: settings.url,
      limit: 1,
      filters: { id_reclamation: [trimmed] }
    })
    const row = res?.data?.[0]
    if (!row) return
    const rowTenant = getTicketCellText(row, 'id_locataire')
    const rowMessage = getTicketCellText(row, 'message')
    if (rowTenant && !tenantNumber.trim()) setTenantNumber(rowTenant)
    if (rowMessage && !message.trim()) setMessage(rowMessage)
  }, [ticketNumber, tenantNumber, message, settings.url])

  const handleRowClick = useCallback(
    (row: TicketRow) => {
      openTicketsOutput({
        ticketNumber: getTicketCellText(row, 'id_reclamation'),
        tenantNumber: getTicketCellText(row, 'id_locataire'),
        message: getTicketCellText(row, 'message'),
        context: '',
        ticketFormat
      })
    },
    [openTicketsOutput, ticketFormat]
  )

  const canSubmit =
    message.trim().length > 0 && (ticketNumber.trim().length > 0 || tenantNumber.trim().length > 0)

  const openManualMessage = useCallback(async () => {
    const ids = generateTicketIds()
    const url = settings.url
    if (url) {
      await persistTicketReclamation(url, ids)
      bumpTicketsRefresh()
    }
    openTicketsOutput({
      ticketNumber: ids.id_reclamation,
      tenantNumber: ids.id_locataire,
      message: '',
      context: '',
      ticketFormat: 'ticketReplyEmail'
    })
  }, [openTicketsOutput, settings.url, bumpTicketsRefresh])

  const runGenerate = useCallback(async () => {
    const url = settings.url
    if (!url || !canSubmit || !isOutput) return

    clearOutputAndDrafts()
    bumpGenerationKey()

    let currentTicketNumber = ticketNumber
    let currentTenantNumber = tenantNumber

    if (needsGeneratedTicketIds(currentTicketNumber, currentTenantNumber)) {
      const ids = generateTicketIds()
      currentTicketNumber = ids.id_reclamation
      currentTenantNumber = ids.id_locataire
      setTicketNumber(currentTicketNumber)
      setTenantNumber(currentTenantNumber)
      await persistTicketReclamation(url, ids)
      bumpTicketsRefresh()
    } else if (currentTicketNumber.trim() && currentTenantNumber.trim()) {
      await persistTicketReclamation(url, {
        id_reclamation: currentTicketNumber,
        id_locataire: currentTenantNumber,
        message
      })
    }

    const payload = buildAnswerPayload({
      id_reclamation: currentTicketNumber,
      id_locataire: currentTenantNumber,
      message,
      context,
      ...(isAnswerFormat(ticketFormat) && channel ? { channel } : {})
    })

    const fp = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        type: f.file.type || 'application/octet-stream',
        buffer: await readFileBuffer(f.file)
      }))
    )

    const result = await generate({
      url,
      conv_id: convId.current,
      payload: serializeWorkflowPayload(payload),
      id_skill,
      files: fp,
      captureReasoning: captureReasoningForSkill(skillConfigs, id_skill)
    })

    if (result.ok && currentTicketNumber.trim()) {
      await recordGenerationDraft({
        ticketNumber: currentTicketNumber,
        id_skill,
        channel,
        subject: result.subject,
        output: result.output,
        reasoning: result.reasoning,
        generated_duration_ms: result.generated_duration_ms
      })
    }
  }, [
    settings.url,
    canSubmit,
    isOutput,
    ticketNumber,
    tenantNumber,
    message,
    context,
    files,
    skillConfigs,
    generate,
    convId,
    id_skill,
    ticketFormat,
    channel,
    clearOutputAndDrafts,
    bumpTicketsRefresh,
    recordGenerationDraft,
    bumpGenerationKey
  ])

  const handleDraftIconClick = useCallback(
    async (
      id_reclamation: string,
      format: TicketSkillKey,
      hasDraft: boolean,
      draft_id_skills?: string[],
      draft_answer_channel?: string | null
    ) => {
      const { id_skill: skill } = formatToWire(format)
      setTicketNumber(id_reclamation)
      setDraftIdSkills(draft_id_skills ?? [])
      setDraftAnswerChannel(draft_answer_channel ?? null)
      setTicketFormat(format)
      pendingDraftIdSkillRef.current = skill

      const ticketsState: Omit<TicketsNavigationState, 'step'> = {
        ticketNumber: id_reclamation,
        tenantNumber: '',
        message: '',
        context: '',
        ticketFormat: format
      }

      if (!hasDraft) {
        clearOutputAndDrafts()
        openTicketsOutput(ticketsState)
        return
      }

      openTicketsOutput(ticketsState)
      await loadTicketDraft(id_reclamation, skill)
    },
    [
      loadTicketDraft,
      openTicketsOutput,
      clearOutputAndDrafts,
      setDraftIdSkills,
      setDraftAnswerChannel
    ]
  )

  const handleCopy = useCallback(
    async (text: string, setCopied: (v: boolean) => void) => {
      await copyText(text, setCopied)
      await saveEditedDraft()
    },
    [copyText, saveEditedDraft]
  )

  const handleExportDocx = useCallback(
    async (text: string, skill: string) => {
      await downloadDocx(text, skill, subject)
      await saveEditedDraft()
    },
    [downloadDocx, saveEditedDraft, subject]
  )

  const addFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => mergeUniqueFiles(prev, incoming))
  }, [])

  const rmFile = (i: number) => setFiles((prev) => prev.filter((_, x) => x !== i))

  useWorkflowKeyboard({
    hidden,
    step,
    isStreaming,
    canSubmit,
    allowSubmitInOutput: true,
    onSubmit: () => void runGenerate(),
    onEscapeHome: goHome,
    onCancelStream: cancel,
    keyActions: ticketSkillKeyActions(setTicketFormat)
  })

  const exportDisabled = !skillHasDocxTemplate(id_skill)
  const allowFileDrop = isOutput

  const formatPicker = (
    <TicketSkillChoiceCards
      value={ticketFormat}
      onValueChange={setTicketFormat}
      draftIdSkills={ticketNumber.trim() ? draftIdSkills : undefined}
      draftAnswerChannel={draftAnswerChannel}
    />
  )

  const primaryAction = (
    <Button
      type="button"
      size="desk-action"
      disabled={!canSubmit || isStreaming}
      onClick={() => void runGenerate()}
    >
      {hasOutputText || hasPersistedDraft ? 'Regénérer un brouillon' : 'Générer un brouillon'}
    </Button>
  )

  const outputActions = (
    <ArtifactToolbarActions
      text={output}
      copied={copiedR}
      setCopied={setCopiedR}
      copyLabel="Copier"
      isStreaming={isStreaming}
      onCopy={handleCopy}
      exportDisabled={exportDisabled}
      onExport={(text) => void handleExportDocx(text, id_skill)}
      ticketUrlPattern={ticketUrlPattern}
      ticketId={ticketNumber}
      dockEmbedded
      trailingActions={
        hasOutputText && !isStreaming ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Évaluer la génération IA"
                  className="text-foreground"
                  onClick={() => setFeedbackDialogOpen(true)}
                />
              }
            >
              <Star />
            </TooltipTrigger>
            <TooltipContent>Évaluer la génération IA</TooltipContent>
          </Tooltip>
        ) : null
      }
    />
  )

  const contextColumn = (
    <TicketContextColumn
      agentName={agentName}
      ticketNumber={ticketNumber}
      onTicketNumberChange={setTicketNumber}
      onTicketNumberBlur={() => {
        void handleTicketNumberBlur()
      }}
      tenantNumber={tenantNumber}
      onTenantNumberChange={setTenantNumber}
      message={message}
      onMessageChange={setMessage}
      context={context}
      onContextChange={setContext}
      files={files}
      onRemoveFile={rmFile}
      formatPicker={formatPicker}
      primaryAction={primaryAction}
      errMsg={errMsg}
    />
  )

  const outputPanel = (
    <TicketOutputPanel
      agentName={agentName}
      showReasoningTokens={showReasoningForRun}
      reasoning={reasoning}
      isStreaming={isStreaming}
      isReasoningPhase={isReasoningPhase}
      hasOutput={hasOutputText}
      output={output}
      onOutputChange={handleOutputChange}
      outputEditorKey={`output-${generationKey}`}
      outputToolbarActions={outputActions}
      draftRevision={draftRevision}
      showDraftRevisionToggle={hasOutputText && !isStreaming && !!draftVariants}
      isAutomationGenerated={draftAutomationId != null}
      onDraftRevisionChange={(revision) => {
        if (revision === 'edited' && !draftVariants?.edited) {
          enterEditedFromGenerated()
          return
        }
        applyDraftRevision(revision)
      }}
      onRequestEdit={enterEditedFromGenerated}
    />
  )

  return (
    <div
      className={cn(
        'tab-panel relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background',
        hidden ? 'hidden' : 'flex'
      )}
      onDragOver={(e) => {
        if (!allowFileDrop) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (!allowFileDrop || !e.dataTransfer.files.length) return
        addFiles(Array.from(e.dataTransfer.files))
      }}
    >
      <AnimatePresence>
        {dragging && allowFileDrop && (
          <motion.div
            key="drag-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.15 } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="bg-background/80 pointer-events-none absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          >
            <div className="border-border bg-card flex flex-col items-center gap-2 rounded-2xl border px-8 py-6 shadow-[0_8px_32px_var(--elevation-raise)]">
              <p className="text-foreground text-sm font-medium">Déposer vos fichiers</p>
              <p className="text-muted-foreground text-xs">PDF, images, documents…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {!isOutput ? (
          <DeskShell className="min-h-0 flex-1">
            <DeskContent className="min-h-0 flex-1">
              <TicketsTableView
                hidden={hidden}
                url={settings.url}
                ticketsRefreshNonce={ticketsRefreshNonce}
                onDraftIconClick={handleDraftIconClick}
                onRowClick={handleRowClick}
                onOpenManualMessage={openManualMessage}
              />
            </DeskContent>
          </DeskShell>
        ) : null}

        {panelReady ? (
          <DeskShell className="absolute inset-0 min-h-0">
            <DeskSplit
              key={panelGroupKey}
              id="tickets-view"
              orientation="horizontal"
              defaultLayout={defaultLayout}
              onLayoutChanged={handleLayoutChanged}
            >
              <DeskPane id={WORKFLOW_PANEL_CONTEXTE} minSize="20%" maxSize="45%">
                {contextColumn}
              </DeskPane>

              <DeskHandle />

              <DeskPane id={WORKFLOW_PANEL_OUTPUT} minSize="40%">
                {outputPanel}
              </DeskPane>
            </DeskSplit>
          </DeskShell>
        ) : null}
      </div>

      <DraftFeedbackDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
        initialRating={draftFeedback.rating}
        initialComment={draftFeedback.comment}
        feedbackBy={draftFeedback.by}
        feedbackAt={draftFeedback.at}
        saving={feedbackSaving}
        onSave={(rating, comment) => void handleSaveFeedback(rating, comment)}
      />
    </div>
  )
}
