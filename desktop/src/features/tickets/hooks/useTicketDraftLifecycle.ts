import { useCallback, useEffect, useRef, useState } from 'react'

import { useTicketDraftSave } from '@/features/tickets/hooks/useTicketDraftSave'
import {
  applyLoadedTicketDraft,
  type DraftFeedbackState
} from '@/features/tickets/lib/apply-loaded-ticket-draft'
import type { TicketSkillKey } from '@/features/tickets/lib/knowledge-skills'
import { resolveDraftToLoad } from '@/features/tickets/lib/resolve-draft-to-load'
import { draftHasFormat } from '@/features/tickets/lib/ticket-draft-icons'
import {
  buildEditDraftPayload,
  buildFeedbackDraftPayload,
  buildGenerationDraftPayload,
  canPersistTicketDraft
} from '@/features/tickets/lib/ticket-draft-payload'
import {
  draftAnswerChannelFromResponse,
  draftIdSkillsFromResponse
} from '@/features/tickets/lib/ticket-draft-response'
import {
  draftVariantForRevision,
  syncDraftVariantInCache,
  type DraftRevision,
  type DraftVariants
} from '@/features/tickets/lib/ticket-draft-revision'
import type { WorkflowGenerationState } from '@/features/workflow/hooks/useWorkflowGeneration'
import { serializeTicketAnswer, TICKET_ANSWER_SKILL } from '@/shared/lib/parse-result'

const EMPTY_FEEDBACK: DraftFeedbackState = {
  rating: null,
  comment: null,
  by: null,
  at: null
}

type PatchState = (patch: Partial<WorkflowGenerationState>) => void

type Options = {
  url: string | undefined
  ticketNumber: string
  ticketFormat: TicketSkillKey
  setTicketFormat: (format: TicketSkillKey) => void
  id_skill: string
  channel: string | undefined
  isOutput: boolean
  isStreaming: boolean
  hasOutputText: boolean
  output: string
  subject: string
  patchState: PatchState
  clearOutput: () => void
  onRefreshTable: () => void
}

function patchDraftIntoState(
  draft: Parameters<typeof applyLoadedTicketDraft>[0]['draft'],
  preferredRevision: DraftRevision | undefined,
  patchState: PatchState
) {
  const loaded = applyLoadedTicketDraft({ draft, preferredRevision })
  const reasoning = draft.generated_reasoning ?? ''
  patchState({
    output: loaded.content.body,
    subject: loaded.content.subject,
    reasoning,
    reasoningCapture: !!reasoning.trim(),
    errMsg: ''
  })
  return loaded
}

export function useTicketDraftLifecycle({
  url,
  ticketNumber,
  ticketFormat,
  setTicketFormat,
  id_skill,
  isOutput,
  isStreaming,
  hasOutputText,
  output,
  subject,
  patchState,
  clearOutput,
  onRefreshTable
}: Options) {
  const [generationKey, setGenerationKey] = useState(0)
  const [draftIdSkills, setDraftIdSkills] = useState<string[]>([])
  const [draftAnswerChannel, setDraftAnswerChannel] = useState<string | null>(null)
  const [draftRevision, setDraftRevision] = useState<DraftRevision>('generated')
  const [draftVariants, setDraftVariants] = useState<DraftVariants | null>(null)
  const [draftAutomationId, setDraftAutomationId] = useState<string | null>(null)
  const [draftFeedback, setDraftFeedback] = useState<DraftFeedbackState>(EMPTY_FEEDBACK)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [feedbackSaving, setFeedbackSaving] = useState(false)

  const pendingDraftIdSkillRef = useRef<string | null>(null)
  const subjectRef = useRef(subject)
  subjectRef.current = subject
  const draftVariantsRef = useRef(draftVariants)
  draftVariantsRef.current = draftVariants
  const draftRevisionRef = useRef(draftRevision)
  draftRevisionRef.current = draftRevision
  const prevTicketFormatRef = useRef<TicketSkillKey | null>(null)
  const autoLoadAttemptedRef = useRef<string | null>(null)

  const { saveDraft } = useTicketDraftSave({ onSaved: onRefreshTable })

  const hasPersistedDraft =
    ticketNumber.trim().length > 0 &&
    draftHasFormat(draftIdSkills, ticketFormat, draftAnswerChannel)

  const serializeDraftOutput = useCallback(
    (body: string, draftSubject = subjectRef.current) => {
      if (id_skill !== TICKET_ANSWER_SKILL) return body
      return serializeTicketAnswer({ subject: draftSubject, body })
    },
    [id_skill]
  )

  const commitLoadedDraft = useCallback(
    (loaded: ReturnType<typeof applyLoadedTicketDraft>, options?: { applyFormat?: boolean }) => {
      if (options?.applyFormat !== false && loaded.format) {
        setTicketFormat(loaded.format)
      }
      if (loaded.answerChannel) setDraftAnswerChannel(loaded.answerChannel)
      setDraftVariants(loaded.variants)
      setDraftRevision(loaded.revision)
      setDraftAutomationId(loaded.automationId)
      setDraftFeedback(loaded.feedback)
      setGenerationKey((k) => k + 1)
    },
    [setTicketFormat]
  )

  const resetDraftVariants = useCallback(() => {
    setDraftRevision('generated')
    setDraftVariants(null)
    setDraftAutomationId(null)
    setDraftFeedback(EMPTY_FEEDBACK)
  }, [])

  const clearOutputAndDrafts = useCallback(() => {
    clearOutput()
    resetDraftVariants()
  }, [clearOutput, resetDraftVariants])

  const applyDraftRevision = useCallback(
    (revision: DraftRevision, variants = draftVariantsRef.current) => {
      if (!variants) return
      const content = draftVariantForRevision(variants, revision)
      setDraftRevision(revision)
      patchState({ output: content.body, subject: content.subject })
      setGenerationKey((k) => k + 1)
    },
    [patchState]
  )

  const enterEditedFromGenerated = useCallback(() => {
    const variants = draftVariantsRef.current
    if (!variants || draftRevisionRef.current === 'edited') return

    if (!variants.edited) {
      const edited = { ...variants.generated }
      const next: DraftVariants = { ...variants, edited, hasEdited: true }
      setDraftVariants(next)
      setDraftRevision('edited')
      patchState({ output: edited.body, subject: edited.subject })
      setGenerationKey((k) => k + 1)
      return
    }

    applyDraftRevision('edited', variants)
  }, [applyDraftRevision, patchState])

  const saveEditedDraft = useCallback(async () => {
    if (!url || !canPersistTicketDraft(ticketNumber, isOutput) || isStreaming) return false

    const variants = draftVariantsRef.current
    const revision = draftRevisionRef.current
    if (!variants?.edited && revision === 'generated') return false

    const content = variants?.edited ?? { body: output, subject: subjectRef.current }

    return saveDraft(
      url,
      buildEditDraftPayload({
        id_reclamation: ticketNumber,
        id_skill: pendingDraftIdSkillRef.current ?? id_skill,
        edited_output: serializeDraftOutput(content.body, content.subject)
      })
    )
  }, [url, ticketNumber, isOutput, isStreaming, id_skill, output, saveDraft, serializeDraftOutput])

  const handleOutputChange = useCallback(
    (v: string) => {
      patchState({ output: v })
      setDraftVariants((prev) => {
        if (!prev) return prev
        return syncDraftVariantInCache(prev, 'edited', {
          body: v,
          subject: subjectRef.current
        })
      })
      setDraftRevision('edited')
    },
    [patchState]
  )

  const loadTicketDraft = useCallback(
    async (id_reclamation: string, skill: string, preferredRevision?: DraftRevision) => {
      if (!url) return false

      pendingDraftIdSkillRef.current = skill

      const res = await window.api.getTicketDraft({
        url,
        id_reclamation,
        id_skill: skill
      })
      const draft =
        res?.data && !Array.isArray(res.data) && typeof res.data === 'object' ? res.data : null
      if (!draft) return false

      const loaded = patchDraftIntoState(draft, preferredRevision, patchState)
      commitLoadedDraft(loaded)
      return true
    },
    [url, patchState, commitLoadedDraft]
  )

  const loadAvailableTicketDraft = useCallback(
    async (
      id_reclamation: string,
      preferredFormat: TicketSkillKey,
      preferredRevision?: DraftRevision
    ) => {
      if (!url) return false

      const res = await window.api.getTicketDraft({ url, id_reclamation })
      const data = res?.data ?? null
      const drafts = Array.isArray(data) ? data : data ? [data] : []

      setDraftIdSkills(draftIdSkillsFromResponse(data))
      const answerChannel = draftAnswerChannelFromResponse(data)
      setDraftAnswerChannel(answerChannel)

      if (drafts.length === 0) return false

      const resolved = resolveDraftToLoad(drafts, preferredFormat, answerChannel)
      if (!resolved) return false

      pendingDraftIdSkillRef.current = resolved.id_skill
      const loaded = patchDraftIntoState(resolved.draft, preferredRevision, patchState)
      commitLoadedDraft(loaded)
      return true
    },
    [url, patchState, commitLoadedDraft]
  )

  const recordGenerationDraft = useCallback(
    async (params: {
      ticketNumber: string
      id_skill: string
      channel: string | undefined
      subject: string
      output: string
      reasoning: string
      generated_duration_ms: number
    }) => {
      if (!url || !params.ticketNumber.trim()) return

      const saved = await saveDraft(
        url,
        buildGenerationDraftPayload({
          id_reclamation: params.ticketNumber,
          id_skill: params.id_skill,
          ...(params.id_skill === TICKET_ANSWER_SKILL ? { channel: params.channel } : {}),
          generated_output: serializeTicketAnswer({
            subject: params.subject,
            body: params.output
          }),
          generated_reasoning: params.reasoning || undefined,
          generated_duration_ms: params.generated_duration_ms
        })
      )
      if (saved) {
        setDraftIdSkills((prev) =>
          prev.includes(params.id_skill) ? prev : [...prev, params.id_skill]
        )
        if (params.channel) setDraftAnswerChannel(params.channel)
      }
      setDraftVariants({
        generated: { body: params.output, subject: params.subject },
        edited: null,
        hasEdited: false
      })
      setDraftRevision('generated')
      setDraftAutomationId(null)
      setDraftFeedback(EMPTY_FEEDBACK)
    },
    [url, saveDraft]
  )

  const handleSaveFeedback = useCallback(
    async (rating: number | null, comment: string) => {
      const trimmed = ticketNumber.trim()
      if (!url || !trimmed) return

      setFeedbackSaving(true)
      try {
        const ok = await saveDraft(
          url,
          buildFeedbackDraftPayload({
            id_reclamation: trimmed,
            id_skill: pendingDraftIdSkillRef.current ?? id_skill,
            feedback_rating: rating,
            feedback_comment: comment || null
          })
        )
        if (ok) {
          setDraftFeedback({
            rating,
            comment: comment || null,
            by: null,
            at: null
          })
          setFeedbackDialogOpen(false)
          const skill = pendingDraftIdSkillRef.current ?? id_skill
          const res = await window.api.getTicketDraft({
            url,
            id_reclamation: trimmed,
            id_skill: skill
          })
          const draft =
            res?.data && !Array.isArray(res.data) && typeof res.data === 'object' ? res.data : null
          if (draft) {
            setDraftFeedback({
              rating: draft.feedback_rating,
              comment: draft.feedback_comment,
              by: draft.feedback_by,
              at: draft.feedback_at
            })
          }
        }
      } finally {
        setFeedbackSaving(false)
      }
    },
    [url, ticketNumber, id_skill, saveDraft]
  )

  const resetDraftFormState = useCallback(() => {
    setDraftIdSkills([])
    setDraftAnswerChannel(null)
    setDraftRevision('generated')
    setDraftVariants(null)
    setDraftAutomationId(null)
    setDraftFeedback(EMPTY_FEEDBACK)
  }, [])

  useEffect(() => {
    const prev = prevTicketFormatRef.current
    prevTicketFormatRef.current = ticketFormat
    if (prev === null || prev === ticketFormat) return

    const trimmed = ticketNumber.trim()
    if (!trimmed) return

    if (draftHasFormat(draftIdSkills, ticketFormat, draftAnswerChannel)) {
      void loadTicketDraft(trimmed, id_skill)
      return
    }

    clearOutputAndDrafts()
    setGenerationKey((k) => k + 1)
  }, [
    ticketFormat,
    ticketNumber,
    draftIdSkills,
    draftAnswerChannel,
    id_skill,
    loadTicketDraft,
    clearOutputAndDrafts
  ])

  useEffect(() => {
    if (!isOutput) return

    const trimmed = ticketNumber.trim()
    if (!trimmed) {
      setDraftIdSkills([])
      setDraftAnswerChannel(null)
      return
    }

    if (!url) return

    // Empty output open is handled by loadAvailableTicketDraft (same endpoint).
    if (!hasOutputText && !isStreaming) return

    const timer = setTimeout(() => {
      void window.api.getTicketDraft({ url, id_reclamation: trimmed }).then((res) => {
        setDraftIdSkills(draftIdSkillsFromResponse(res?.data ?? null))
        setDraftAnswerChannel(draftAnswerChannelFromResponse(res?.data ?? null))
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [isOutput, ticketNumber, url, hasOutputText, isStreaming])

  useEffect(() => {
    if (!isOutput || isStreaming || hasOutputText) return
    const trimmed = ticketNumber.trim()
    if (!trimmed || !url) return
    if (autoLoadAttemptedRef.current === trimmed) return
    autoLoadAttemptedRef.current = trimmed

    void loadAvailableTicketDraft(trimmed, ticketFormat)
    // ticketFormat read at open time only; omit from deps so format switches do not re-trigger.
  }, [isOutput, isStreaming, hasOutputText, ticketNumber, url, loadAvailableTicketDraft])

  useEffect(() => {
    if (!isOutput) autoLoadAttemptedRef.current = null
  }, [isOutput, ticketNumber])

  return {
    generationKey,
    bumpGenerationKey: () => setGenerationKey((k) => k + 1),
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
    loadAvailableTicketDraft,
    recordGenerationDraft,
    handleSaveFeedback
  }
}
