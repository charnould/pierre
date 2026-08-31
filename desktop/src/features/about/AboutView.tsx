import { useCallback, useEffect, useRef, useState } from 'react'

import {
  useNavigationHistory,
  useRegisterNavigationHandlers
} from '@/contexts/NavigationHistoryContext'
import { useUiSettings } from '@/contexts/UiSettingsContext'
import { AboutContextColumn } from '@/features/about/components/AboutContextColumn'
import { AboutOutputPanel } from '@/features/about/components/AboutOutputPanel'
import {
  aboutIdSkill,
  aboutPrimaryActionLabel,
  buildAboutNavigationState,
  canSubmitAboutForm,
  defaultAboutFormFields,
  parseAboutYear,
  shouldAutoOpenAboutOutputStep,
  shouldClearAboutOutputOnSubjectChange
} from '@/features/about/lib/about-form'
import type { AboutSubject } from '@/features/tickets/lib/knowledge-skills'
import { useWorkflowPanel } from '@/features/workflow/hooks/useWorkflowPanel'
import { useWorkflowKeyboard } from '@/features/workflow/lib/workflow-keyboard'
import {
  buildSynthesePayload,
  serializeWorkflowPayload
} from '@/features/workflow/lib/workflow-payload'
import { Button } from '@/shared/components/ui/button'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@/shared/components/ui/resizable'
import { useDebouncedWorkflowPatch } from '@/shared/hooks/useDebouncedWorkflowPatch'
import { reasoningDisplayForSkill } from '@/shared/hooks/useSkillConfigs'
import type { AboutNavigationState, NavigationSnapshot } from '@/shared/lib/navigation-snapshot'
import { releaseConversationVm } from '@/shared/lib/release-conversation-vm'
import type { Tab } from '@/shared/lib/tabs'
import {
  WORKFLOW_PANEL_CONTEXTE,
  WORKFLOW_PANEL_OUTPUT,
  WORKFLOW_SPLIT_DEFAULT_CONTEXTE,
  defaultWorkflowPanelLayout,
  resolveWorkflowOutputSplit,
  splitFromLayout,
  type WorkflowOutputSplitKey
} from '@/shared/lib/ui-settings/schema'
import { cn } from '@/shared/lib/utils'
import type { Settings } from '@/shared/types'

interface Props {
  hidden: boolean
  settings: Settings
  onNavigate: (tab: Tab) => void
  agentName: string
}

const ABOUT_SPLIT_KEY: WorkflowOutputSplitKey = 'aboutOutputSplit'

export function AboutView({ hidden, settings, onNavigate, agentName }: Props) {
  const { settings: uiSettings, loading } = useUiSettings()
  const { patch: patchWorkflow, cancel: cancelWorkflowPatch } = useDebouncedWorkflowPatch({
    delayMs: 400
  })

  const defaults = defaultAboutFormFields()
  const [aboutSubject, setAboutSubject] = useState<AboutSubject>(defaults.aboutSubject)
  const [yearFrom, setYearFrom] = useState(defaults.yearFrom)
  const [yearTo, setYearTo] = useState(defaults.yearTo)
  const [entityId, setEntityId] = useState(defaults.entityId)
  const [context, setContext] = useState(defaults.context)
  const snapshotAppliedRef = useRef(false)
  const prevAboutSubjectRef = useRef<AboutSubject | null>(null)
  const { navigate } = useNavigationHistory()

  const outputSplit = resolveWorkflowOutputSplit(uiSettings.workflow, ABOUT_SPLIT_KEY)
  const savedSplitRef = useRef(outputSplit)
  useEffect(() => {
    savedSplitRef.current = resolveWorkflowOutputSplit(uiSettings.workflow, ABOUT_SPLIT_KEY)
  }, [uiSettings.workflow])

  useEffect(() => {
    if (loading) cancelWorkflowPatch()
  }, [loading, cancelWorkflowPatch])

  const panelGroupKey = `${ABOUT_SPLIT_KEY}-${outputSplit.contextePercent ?? WORKFLOW_SPLIT_DEFAULT_CONTEXTE}`
  const defaultLayout = defaultWorkflowPanelLayout(outputSplit)
  const panelReady = !loading && !hidden

  const handleLayoutChanged = useCallback(
    (layout: Record<string, number>) => {
      if (!panelReady) return
      const nextSplit = splitFromLayout(layout)
      if (savedSplitRef.current?.contextePercent === nextSplit.contextePercent) return
      savedSplitRef.current = nextSplit
      patchWorkflow({ [ABOUT_SPLIT_KEY]: nextSplit })
    },
    [panelReady, patchWorkflow]
  )

  const id_skill = aboutIdSkill(aboutSubject)
  const canSubmit = canSubmitAboutForm(entityId, yearFrom, yearTo)

  const resetForm = useCallback(() => {
    const next = defaultAboutFormFields()
    setAboutSubject(next.aboutSubject)
    setYearFrom(next.yearFrom)
    setYearTo(next.yearTo)
    setEntityId(next.entityId)
    setContext(next.context)
  }, [])

  const {
    state,
    convId,
    generate,
    clearOutput,
    copyText,
    reasoningUi,
    skillConfigs,
    step,
    setStep,
    isOutput,
    goHome,
    cancel,
    resetConvId
  } = useWorkflowPanel({
    url: settings.url,
    id_skill,
    onNavigate,
    resetForm
  })

  const buildAboutSnapshot = useCallback(
    (nextStep: AboutNavigationState['step']): AboutNavigationState =>
      buildAboutNavigationState(nextStep, { aboutSubject, entityId, yearFrom, yearTo, context }),
    [aboutSubject, entityId, yearFrom, yearTo, context]
  )

  const applyAboutSnapshot = useCallback(
    (snapshot: NavigationSnapshot) => {
      snapshotAppliedRef.current = true
      const aboutState = snapshot.about
      if (!aboutState) {
        setStep('form')
        return
      }

      setAboutSubject(aboutState.aboutSubject)
      setEntityId(aboutState.entityId)
      setYearFrom(aboutState.yearFrom)
      setYearTo(aboutState.yearTo ?? defaultAboutFormFields().yearTo)
      setContext(aboutState.context ?? '')
      setStep(aboutState.step)
    },
    [setStep]
  )

  useRegisterNavigationHandlers('about', {
    getSnapshot: () => ({
      about: buildAboutSnapshot(step)
    }),
    applySnapshot: applyAboutSnapshot,
    beforeLeave: async () => {
      cancel()
      releaseConversationVm(settings.url, convId.current)
    }
  })

  useEffect(() => {
    if (shouldAutoOpenAboutOutputStep(step, snapshotAppliedRef.current)) {
      setStep('output')
    }
  }, [step, setStep])

  const { output, reasoning, isStreaming, isReasoningPhase, reasoningCapture, errMsg } = state
  const showReasoningForRun =
    reasoningCapture && (reasoningUi.showReasoningTokens || Object.keys(skillConfigs).length === 0)
  const hasOutputText = !!output.trim()

  useEffect(() => {
    const prev = prevAboutSubjectRef.current
    prevAboutSubjectRef.current = aboutSubject
    if (!shouldClearAboutOutputOnSubjectChange(prev, aboutSubject, isOutput, isStreaming)) return
    clearOutput()
    resetConvId()
  }, [aboutSubject, isOutput, isStreaming, clearOutput, resetConvId])

  const runGenerate = useCallback(async () => {
    const url = settings.url
    if (!url || !canSubmit || !isOutput) return
    const id = entityId.trim()
    const from = parseAboutYear(yearFrom)
    const to = parseAboutYear(yearTo)
    if (!id || from === null || to === null) return

    navigate({
      tab: 'about',
      about: buildAboutNavigationState('output', {
        aboutSubject,
        entityId: id,
        yearFrom,
        yearTo,
        context
      })
    })

    const payload = buildSynthesePayload({
      about_subject: aboutSubject,
      identifiant: id,
      year_from: from,
      year_to: to,
      context
    })
    const display = reasoningDisplayForSkill(skillConfigs, id_skill)

    await generate({
      url,
      conv_id: convId.current,
      payload: serializeWorkflowPayload(payload),
      id_skill,
      files: [],
      captureReasoning: display !== 'off'
    })
  }, [
    settings.url,
    canSubmit,
    isOutput,
    entityId,
    yearFrom,
    yearTo,
    context,
    aboutSubject,
    skillConfigs,
    generate,
    convId,
    id_skill,
    navigate
  ])

  const runRegenerate = useCallback(async () => {
    if (isStreaming) return
    clearOutput()
    await runGenerate()
  }, [isStreaming, clearOutput, runGenerate])

  useWorkflowKeyboard({
    hidden,
    step,
    isStreaming,
    canSubmit,
    allowSubmitInOutput: true,
    onSubmit: () => void runGenerate(),
    onEscapeHome: goHome,
    onCancelStream: cancel
  })

  const primaryAction = (
    <Button
      type="button"
      className="w-full"
      disabled={!canSubmit || isStreaming}
      onClick={() => void (hasOutputText ? runRegenerate() : runGenerate())}
    >
      {aboutPrimaryActionLabel(hasOutputText)}
    </Button>
  )

  return (
    <div
      data-tab-panel
      className={cn(
        'relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background',
        hidden ? 'hidden' : 'flex'
      )}
    >
      {panelReady && isOutput ? (
        <ResizablePanelGroup
          key={panelGroupKey}
          id="about-view"
          orientation="horizontal"
          defaultLayout={defaultLayout}
          onLayoutChanged={handleLayoutChanged}
          className="min-h-0 flex-1"
        >
          <ResizablePanel
            id={WORKFLOW_PANEL_CONTEXTE}
            minSize="20%"
            maxSize="45%"
            className="flex min-h-0 min-w-0 flex-col overflow-hidden"
          >
            <AboutContextColumn
              aboutSubject={aboutSubject}
              onAboutSubjectChange={setAboutSubject}
              entityId={entityId}
              onEntityIdChange={setEntityId}
              yearFrom={yearFrom}
              onYearFromChange={setYearFrom}
              yearTo={yearTo}
              onYearToChange={setYearTo}
              context={context}
              onContextChange={setContext}
              agentName={agentName}
              primaryAction={primaryAction}
              errMsg={errMsg}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            id={WORKFLOW_PANEL_OUTPUT}
            minSize="40%"
            className="flex min-h-0 min-w-0 flex-col overflow-hidden"
          >
            <AboutOutputPanel
              agentName={agentName}
              url={settings.url}
              showReasoningTokens={showReasoningForRun}
              reasoning={reasoning}
              isStreaming={isStreaming}
              isReasoningPhase={isReasoningPhase}
              hasOutput={hasOutputText}
              output={output}
              onCopy={copyText}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : null}
    </div>
  )
}
