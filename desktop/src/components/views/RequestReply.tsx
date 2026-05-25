import { Play } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ArtifactMarkdownEditor } from '@/components/workflow/ArtifactMarkdownEditor'
import {
  ANSWER_OUTPUT_CONTENT_MAX_W,
  ArtifactToolbarActions,
  mergeUniqueFiles,
  PANEL_BG_CLASS,
  PANEL_CONTENT_MAX_W,
  WORKFLOW_ANSWER_TEXTAREA_CLASS,
  WORKFLOW_ARTIFACT_TITLE_CLASS,
  WORKFLOW_FORM_ANSWER_CLASS,
  WORKFLOW_FORM_ANSWER_INNER_CLASS,
  WORKFLOW_FORM_CLASS,
  WORKFLOW_FORM_STAGE_CLASS,
  WORKFLOW_FORM_LEGEND_CLASS,
  WORKFLOW_INPUT_CLASS,
  WORKFLOW_TEXTAREA_CLASS,
  WORKFLOW_TOOLBAR_ACTIONS_CLASS,
  WorkflowFormField,
  type FileEntry
} from '@/components/workflow/WorkflowPanelChrome'
import { cn } from '@/lib/utils'

import { reasoningDisplayForSkill } from '../../hooks/useSkillConfigs'
import { useWorkflowPanel } from '../../hooks/useWorkflowPanel'
import {
  KNOWLEDGE_SKILL,
  REQUEST_SKILL_OPTIONS,
  requestSkillKeyActions,
  type RequestSkillKey
} from '../../lib/knowledge-skills'
import type { Tab } from '../../lib/tabs'
import { useWorkflowKeyboard } from '../../lib/workflow-keyboard'
import {
  buildAnswerPayload,
  serializeWorkflowPayload,
  type AnswerMode
} from '../../lib/workflow-payload'
import type { Settings } from '../../types'
import { FileChips } from '../../workflows/FileChips'
import { readFileBuffer } from '../../workflows/read-file-buffer'
import { WorkflowOutputShell } from '../../workflows/WorkflowOutputShell'

interface Props {
  hidden: boolean
  settings: Settings
  onNavigate: (tab: Tab) => void
  agentName: string
}

export function RequestReply({ hidden, settings, onNavigate, agentName }: Props) {
  const [answerMode, setAnswerMode] = useState<AnswerMode>('message')
  const [affaireNumber, setAffaireNumber] = useState('')
  const [tenantNumber, setTenantNumber] = useState('')
  const [message, setMessage] = useState('')
  const [context, setContext] = useState('')
  const [requestSkill, setRequestSkill] = useState<RequestSkillKey>('requestReplyEmail')
  const [files, setFiles] = useState<FileEntry[]>([])
  const [dragging, setDragging] = useState(false)
  const [copiedA, setCopiedA] = useState(false)
  const [copiedR, setCopiedR] = useState(false)
  const [generationKey, setGenerationKey] = useState(0)

  const affaireId = useId()
  const contextAffaireId = useId()
  const tenantId = useId()
  const messageId = useId()
  const contextMessageId = useId()

  const activeSkillId = KNOWLEDGE_SKILL[requestSkill]

  const resetForm = useCallback(() => {
    setAnswerMode('message')
    setAffaireNumber('')
    setTenantNumber('')
    setMessage('')
    setContext('')
    setRequestSkill('requestReplyEmail')
    setFiles([])
    setCopiedA(false)
    setCopiedR(false)
  }, [])

  const canSubmit =
    answerMode === 'affaire'
      ? affaireNumber.trim().length > 0
      : tenantNumber.trim().length > 0 && message.trim().length > 0

  const {
    feedRef,
    state,
    convId,
    generate,
    patchState,
    copyText,
    downloadDocx,
    reasoningUi,
    skillConfigs,
    step,
    isOutput,
    resetWorkflow,
    beginOutput,
    goHome,
    cancel
  } = useWorkflowPanel({
    url: settings.url,
    activeSkillId,
    onNavigate,
    resetForm
  })

  const { analysis, response, reasoning, isStreaming, isReasoningPhase, errMsg } = state
  const hasOutputText = !!response.trim()
  const hasAnalysis = !!analysis.trim()

  const addFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => mergeUniqueFiles(prev, incoming))
  }, [])

  const rmFile = (i: number) => setFiles((prev) => prev.filter((_, x) => x !== i))

  const runGenerate = useCallback(async () => {
    const url = settings.url
    if (!url || !canSubmit) return

    setGenerationKey((k) => k + 1)
    beginOutput()

    const payload = buildAnswerPayload({
      mode: answerMode,
      id_request: affaireNumber,
      id_locataire: tenantNumber,
      message,
      contexte: context
    })

    const fp = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        type: f.file.type || 'application/octet-stream',
        buffer: await readFileBuffer(f.file)
      }))
    )

    const skill = KNOWLEDGE_SKILL[requestSkill]
    const display = reasoningDisplayForSkill(skillConfigs, skill)

    await generate({
      url,
      conv_id: convId.current,
      payload: serializeWorkflowPayload(payload),
      skill,
      files: fp,
      captureReasoning: display !== 'off'
    })
  }, [
    settings.url,
    canSubmit,
    beginOutput,
    answerMode,
    affaireNumber,
    tenantNumber,
    message,
    context,
    files,
    requestSkill,
    skillConfigs,
    generate,
    convId
  ])

  useWorkflowKeyboard({
    hidden,
    step,
    isStreaming,
    canSubmit,
    onSubmit: () => void runGenerate(),
    onEscapeHome: goHome,
    onCancelStream: cancel,
    keyActions: requestSkillKeyActions(setRequestSkill)
  })

  const analysisActions = (
    <ArtifactToolbarActions
      text={analysis}
      copied={copiedA}
      setCopied={setCopiedA}
      copyLabel="Copier l'analyse"
      isStreaming={isStreaming}
      onCopy={copyText}
      onExport={downloadDocx}
      onRegenerate={() => void runGenerate()}
    />
  )

  const responseActions = (
    <ArtifactToolbarActions
      text={response}
      copied={copiedR}
      setCopied={setCopiedR}
      copyLabel="Copier"
      isStreaming={isStreaming}
      onCopy={copyText}
      onExport={downloadDocx}
    />
  )

  return (
    <div
      className={`tab-panel relative min-h-0 flex-1 flex-col ${PANEL_BG_CLASS} ${hidden ? 'hidden' : 'flex'}`}
      onDragOver={(e) => {
        if (isOutput) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (isOutput || !e.dataTransfer.files.length) return
        addFiles(Array.from(e.dataTransfer.files))
      }}
    >
      <AnimatePresence>
        {dragging && !isOutput && (
          <motion.div
            key="drag-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.15 } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
          >
            <p className="text-primary text-sm font-medium">Déposer vos fichiers</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          'mx-auto flex w-full min-h-0 flex-1 flex-col',
          isOutput ? ANSWER_OUTPUT_CONTENT_MAX_W : PANEL_CONTENT_MAX_W,
          isOutput ? 'justify-start pt-0' : 'min-h-0'
        )}
      >
        {!isOutput && (
          <div className={WORKFLOW_FORM_STAGE_CLASS}>
            <div
              className={cn(WORKFLOW_FORM_CLASS, WORKFLOW_FORM_ANSWER_CLASS, 'w-full max-w-full')}
            >
              <div className={WORKFLOW_FORM_ANSWER_INNER_CLASS}>
                <Tabs
                  value={answerMode}
                  onValueChange={(v) => {
                    if (v === 'affaire' || v === 'message') setAnswerMode(v)
                  }}
                  className="gap-3"
                >
                  <TabsList className="grid h-9 w-full grid-cols-2">
                    <TabsTrigger value="affaire" className="flex-1">
                      Répondre à une Par n°affaire
                    </TabsTrigger>
                    <TabsTrigger value="message" className="flex-1">
                      Par saisie du message
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="affaire" className="mt-0 flex flex-col gap-2.5">
                    <WorkflowFormField label="N° d'affaire" htmlFor={affaireId}>
                      <Input
                        id={affaireId}
                        type="text"
                        autoFocus={answerMode === 'affaire'}
                        value={affaireNumber}
                        onChange={(e) => setAffaireNumber(e.target.value)}
                        placeholder="REQ-2024-00142"
                        className={WORKFLOW_INPUT_CLASS}
                      />
                    </WorkflowFormField>
                    <WorkflowFormField label="Contexte additionnel" htmlFor={contextAffaireId}>
                      <Textarea
                        id={contextAffaireId}
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        placeholder="Historique, statut du dossier, ton souhaité…"
                        rows={3}
                        className={cn(WORKFLOW_TEXTAREA_CLASS, WORKFLOW_ANSWER_TEXTAREA_CLASS)}
                      />
                    </WorkflowFormField>
                    <FileChips files={files} onRemove={rmFile} />
                  </TabsContent>

                  <TabsContent value="message" className="mt-0 flex flex-col gap-2.5">
                    <WorkflowFormField label="N° locataire" htmlFor={tenantId}>
                      <Input
                        id={tenantId}
                        type="text"
                        inputMode="numeric"
                        autoFocus={answerMode === 'message'}
                        value={tenantNumber}
                        onChange={(e) => setTenantNumber(e.target.value)}
                        placeholder="187329"
                        className={WORKFLOW_INPUT_CLASS}
                      />
                    </WorkflowFormField>
                    <WorkflowFormField label="Message du locataire" htmlFor={messageId}>
                      <Textarea
                        id={messageId}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Bonjour, j'ai un problème de paiement sur mon loyer..."
                        rows={4}
                        className={cn(WORKFLOW_TEXTAREA_CLASS, WORKFLOW_ANSWER_TEXTAREA_CLASS)}
                      />
                    </WorkflowFormField>
                    <WorkflowFormField label="Contexte additionnel" htmlFor={contextMessageId}>
                      <Textarea
                        id={contextMessageId}
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        placeholder="Historique, statut du dossier, ton souhaité…"
                        rows={3}
                        className={cn(WORKFLOW_TEXTAREA_CLASS, WORKFLOW_ANSWER_TEXTAREA_CLASS)}
                      />
                    </WorkflowFormField>
                    <FileChips files={files} onRemove={rmFile} />
                  </TabsContent>
                </Tabs>

                <div className="border-border mt-0.5 flex flex-wrap items-center justify-between gap-3 border-t pt-3.5">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                    <FieldLabel className="shrink-0">Format</FieldLabel>
                    <RadioGroup
                      value={requestSkill}
                      onValueChange={(v) => {
                        if (REQUEST_SKILL_OPTIONS.some((o) => o.value === v)) {
                          setRequestSkill(v as RequestSkillKey)
                        }
                      }}
                      className="border-border bg-muted inline-flex h-8 min-h-8 w-full flex-1 gap-0.5 rounded-lg border p-0.5 max-[720px]:grid max-[720px]:grid-cols-2"
                      aria-label="Format de réponse"
                    >
                      {REQUEST_SKILL_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          title={opt.label}
                          className={cn(
                            'relative flex h-full min-h-0 flex-1 cursor-pointer items-center justify-center rounded-md px-3',
                            'text-sm font-medium text-muted-foreground transition-colors',
                            'hover:text-foreground',
                            'has-[[data-checked]]:bg-background has-[[data-checked]]:text-foreground has-[[data-checked]]:shadow-sm',
                            'has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
                            'max-[720px]:px-2 max-[720px]:text-center max-[720px]:whitespace-normal'
                          )}
                        >
                          <RadioGroupItem
                            value={opt.value}
                            className="pointer-events-none absolute size-px overflow-hidden opacity-0"
                          />
                          <span className="pointer-events-none select-none">
                            {opt.segmentLabel}
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div
                    className={cn(
                      WORKFLOW_TOOLBAR_ACTIONS_CLASS,
                      'max-[720px]:w-full max-[720px]:border-l-0 max-[720px]:pl-0 max-[720px]:justify-end'
                    )}
                  >
                    <Button
                      type="button"
                      disabled={!canSubmit || isStreaming}
                      onClick={() => void runGenerate()}
                    >
                      <Play className="size-3.5" strokeWidth={2} />
                      Préparer un brouillon
                    </Button>
                  </div>
                </div>

                <p className={WORKFLOW_FORM_LEGEND_CLASS}>
                  {agentName} peut faire des erreurs — vérifiez les informations importantes avant
                  envoi.
                </p>
              </div>
            </div>

            {errMsg && <p className="text-destructive mt-2.5 text-sm">{errMsg}</p>}
          </div>
        )}

        <AnimatePresence>
          {isOutput && (
            <WorkflowOutputShell
              reasoningCollapsible={reasoningUi.reasoningCollapsible}
              showReasoningTokens={reasoningUi.showReasoningTokens}
              reasoning={reasoning}
              isStreaming={isStreaming}
              isReasoningPhase={isReasoningPhase}
              onResetToForm={resetWorkflow}
              compactToolbar
              feedRef={feedRef}
              errMsg={errMsg}
            >
              <ResizablePanelGroup
                orientation="horizontal"
                className="workflow-output-panels min-h-0 flex-1"
              >
                <ResizablePanel defaultSize={50} minSize={20} className="min-w-0">
                  <article className="workflow-output-artifact workflow-output-artifact--analyse">
                    <header className="workflow-output-artifact-header">
                      <h3 className={WORKFLOW_ARTIFACT_TITLE_CLASS}>Analyse</h3>
                    </header>
                    <div className="workflow-output-artifact-body">
                      {isStreaming || hasAnalysis ? (
                        <ArtifactMarkdownEditor
                          key={`analysis-${generationKey}`}
                          variant="analysis"
                          content={analysis}
                          onChange={(v) => patchState({ analysis: v })}
                          isStreaming={isStreaming}
                          actions={analysisActions}
                        />
                      ) : (
                        <p className="text-muted-foreground text-sm">En attente…</p>
                      )}
                    </div>
                  </article>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={50} minSize={20} className="min-w-0">
                  <article className="workflow-output-artifact workflow-output-artifact--reponse">
                    <header className="workflow-output-artifact-header">
                      <h3 className={WORKFLOW_ARTIFACT_TITLE_CLASS}>Proposition de réponse</h3>
                    </header>
                    <div className="workflow-output-artifact-body">
                      {isStreaming || hasOutputText ? (
                        <ArtifactMarkdownEditor
                          key={`response-${generationKey}`}
                          variant="response"
                          content={response}
                          onChange={(v) => patchState({ response: v })}
                          isStreaming={isStreaming}
                          actions={responseActions}
                        />
                      ) : (
                        <p className="text-muted-foreground text-sm">En attente…</p>
                      )}
                    </div>
                  </article>
                </ResizablePanel>
              </ResizablePanelGroup>
            </WorkflowOutputShell>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
