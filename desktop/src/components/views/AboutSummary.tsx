import { Play } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useCallback, useId, useState } from 'react'
import { Streamdown } from 'streamdown'

import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  PANEL_BG_CLASS,
  PANEL_CONTENT_MAX_W,
  WORKFLOW_FORM_CLASS,
  WORKFLOW_FORM_INNER_CLASS,
  WORKFLOW_FORM_STAGE_CLASS,
  WORKFLOW_FORM_LEGEND_CLASS,
  WORKFLOW_INPUT_CLASS,
  WORKFLOW_SELECT_TRIGGER_CLASS,
  WORKFLOW_TOOLBAR_ACTIONS_CLASS,
  WORKFLOW_TOOLBAR_GROUP_CLASS,
  WorkflowFormField
} from '@/components/workflow/WorkflowPanelChrome'
import { cn } from '@/lib/utils'

import { reasoningDisplayForSkill } from '../../hooks/useSkillConfigs'
import { useWorkflowPanel } from '../../hooks/useWorkflowPanel'
import {
  ABOUT_SUBJECTS,
  ABOUT_SUBJECT_TO_SKILL,
  KNOWLEDGE_SKILL,
  type AboutSubject
} from '../../lib/knowledge-skills'
import type { Tab } from '../../lib/tabs'
import { useWorkflowKeyboard } from '../../lib/workflow-keyboard'
import { buildSynthesePayload, serializeWorkflowPayload } from '../../lib/workflow-payload'
import type { Settings } from '../../types'
import { WorkflowOutputShell } from '../../workflows/WorkflowOutputShell'

const YEARS = Array.from({ length: 30 }, (_, i) => String(2000 + i))
const YEAR_ITEMS = YEARS.map((y) => ({ label: y, value: y }))

const ABOUT_SUBJECT_OPTIONS: { value: AboutSubject; label: string }[] = [
  { value: 'locataire', label: 'Locataire' },
  { value: 'lot', label: 'Lot' },
  { value: 'programme', label: 'Programme' }
]

const ABOUT_SUBJECT_ENTITY: Record<AboutSubject, { placeholder: string; ariaLabel: string }> = {
  locataire: { placeholder: 'LOC-187329', ariaLabel: 'Identifiant locataire' },
  lot: { placeholder: 'LOT-0029700099', ariaLabel: 'Identifiant du lot' },
  programme: { placeholder: 'PRG-001', ariaLabel: 'Identifiant du programme' }
}

interface Props {
  hidden: boolean
  settings: Settings
  onNavigate: (tab: Tab) => void
  agentName: string
}

export function AboutSummary({ hidden, settings, onNavigate, agentName }: Props) {
  const [aboutSubject, setAboutSubject] = useState<AboutSubject>('locataire')
  const [yearFrom, setYearFrom] = useState('2000')
  const [entityId, setEntityId] = useState('')
  const [copiedR, setCopiedR] = useState(false)
  const entityIdField = useId()

  const activeSkillId = KNOWLEDGE_SKILL[ABOUT_SUBJECT_TO_SKILL[aboutSubject]]

  const resetForm = useCallback(() => {
    setAboutSubject('locataire')
    setYearFrom('2000')
    setEntityId('')
    setCopiedR(false)
  }, [])

  const yearFromNum = parseInt(yearFrom, 10)
  const yearValid = !Number.isNaN(yearFromNum)
  const canSubmit = entityId.trim().length > 0 && yearValid

  const {
    feedRef,
    state,
    convId,
    generate,
    clearOutput,
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

  const { response, reasoning, isStreaming, isReasoningPhase, errMsg } = state
  const hasOutputText = !!response.trim()

  const runGenerate = useCallback(async () => {
    const url = settings.url
    if (!url) return
    const id = entityId.trim()
    const from = parseInt(yearFrom, 10)
    if (!id || Number.isNaN(from)) return

    beginOutput()

    const payload = buildSynthesePayload({
      about_subject: aboutSubject,
      identifiant: id,
      year_from: from
    })
    const skill = KNOWLEDGE_SKILL[ABOUT_SUBJECT_TO_SKILL[aboutSubject]]
    const display = reasoningDisplayForSkill(skillConfigs, skill)

    await generate({
      url,
      conv_id: convId.current,
      payload: serializeWorkflowPayload(payload),
      skill,
      files: [],
      captureReasoning: display !== 'off'
    })
  }, [settings.url, entityId, yearFrom, aboutSubject, skillConfigs, generate, convId, beginOutput])

  const runRegenerate = useCallback(async () => {
    if (isStreaming) return
    clearOutput()
    setCopiedR(false)
    await runGenerate()
  }, [isStreaming, clearOutput, runGenerate])

  useWorkflowKeyboard({
    hidden,
    step,
    isStreaming,
    canSubmit,
    onSubmit: () => void runGenerate(),
    onEscapeHome: goHome,
    onCancelStream: cancel
  })

  const { placeholder: entityPlaceholder } = ABOUT_SUBJECT_ENTITY[aboutSubject]

  return (
    <div
      className={`tab-panel relative min-h-0 flex-1 flex-col ${PANEL_BG_CLASS} ${hidden ? 'hidden' : 'flex'}`}
    >
      <div
        className={cn(
          'mx-auto flex w-full min-h-0 flex-1 flex-col',
          PANEL_CONTENT_MAX_W,
          isOutput ? 'justify-start pt-0' : 'min-h-0'
        )}
      >
        {!isOutput && (
          <div className={WORKFLOW_FORM_STAGE_CLASS}>
            <div className={cn(WORKFLOW_FORM_CLASS, 'w-full max-w-full')}>
              <div className={WORKFLOW_FORM_INNER_CLASS}>
                <FieldGroup className={WORKFLOW_TOOLBAR_GROUP_CLASS}>
                  <WorkflowFormField label="Thématique" className="w-[9.5rem]">
                    <Select
                      items={ABOUT_SUBJECT_OPTIONS}
                      value={aboutSubject}
                      onValueChange={(v) => {
                        if (v != null && (ABOUT_SUBJECTS as readonly string[]).includes(v)) {
                          setAboutSubject(v as AboutSubject)
                        }
                      }}
                    >
                      <SelectTrigger
                        aria-label="Thématique"
                        className={WORKFLOW_SELECT_TRIGGER_CLASS}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {ABOUT_SUBJECT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </WorkflowFormField>

                  <WorkflowFormField label="À partir de" className="w-[5.5rem]">
                    <Select
                      items={YEAR_ITEMS}
                      value={yearFrom}
                      onValueChange={(v) => v != null && setYearFrom(v)}
                    >
                      <SelectTrigger
                        aria-label="À partir de"
                        className={cn(WORKFLOW_SELECT_TRIGGER_CLASS, 'tabular-nums')}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {YEAR_ITEMS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </WorkflowFormField>

                  <WorkflowFormField
                    label="Identifiant"
                    htmlFor={entityIdField}
                    className="min-w-[8rem] flex-1"
                  >
                    <Input
                      id={entityIdField}
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      value={entityId}
                      onChange={(e) => setEntityId(e.target.value)}
                      placeholder={entityPlaceholder}
                      className={WORKFLOW_INPUT_CLASS}
                    />
                  </WorkflowFormField>

                  <div className={WORKFLOW_TOOLBAR_ACTIONS_CLASS}>
                    <Button
                      type="button"
                      disabled={!canSubmit || isStreaming}
                      onClick={() => void runGenerate()}
                    >
                      <Play className="size-3.5" strokeWidth={2} />
                      Générer une synthèse
                    </Button>
                  </div>
                </FieldGroup>

                <p className={WORKFLOW_FORM_LEGEND_CLASS}>
                  {agentName} n'a pas accès aux prénoms, noms, coordonnées et adresses exactes des
                  locataires pour des raisons liées à la RGPD. Une IA peut faire des erreurs —
                  vérifiez les informations importantes.
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
              hasOutputText={hasOutputText}
              copiedR={copiedR}
              onCopyResponse={() => void copyText(response, setCopiedR)}
              onExportResponse={() => void downloadDocx(response)}
              onRegenerate={() => void runRegenerate()}
              onResetToForm={resetWorkflow}
              compactToolbar
              feedRef={feedRef}
              errMsg={errMsg}
            >
              <Streamdown
                isAnimating={isStreaming}
                animated={isStreaming}
                mode={isStreaming ? 'streaming' : 'static'}
                caret={isStreaming ? 'block' : undefined}
                className="sd-response"
              >
                {response}
              </Streamdown>
            </WorkflowOutputShell>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
