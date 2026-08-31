import { useCallback, useMemo } from 'react'

import { useWorkflowGeneration } from '@/features/workflow/hooks/useWorkflowGeneration'
import {
  buildAnswerPayload,
  serializeWorkflowPayload,
  type AnswerChannel
} from '@/features/workflow/lib/workflow-payload'
import {
  captureReasoningForSkill,
  reasoningUiForSkill,
  useSkillConfigs
} from '@/shared/hooks/useSkillConfigs'
import type { Activite } from '@/shared/types/activites'
import { activity_payload } from '@/shared/types/activites'

import { KNOWLEDGE_SKILL } from './knowledge-skills'

function timelineContext(activities: Activite[]): string {
  if (activities.length === 0) return ''
  return activities
    .slice(0, 30)
    .map((row) => {
      const payload = activity_payload(row.type, row.contenu)
      const content = typeof payload['contenu'] === 'string' ? payload['contenu'] : row.type
      return `- ${row.date_creation} (${row.type}) : ${content}`
    })
    .join('\n')
}

export function useTicketSheetAi(url: string | undefined) {
  const skillConfigs = useSkillConfigs(url)
  const { generate, convId, resetConvId, state } = useWorkflowGeneration({ url })

  const answerReasoningUi = reasoningUiForSkill(skillConfigs, KNOWLEDGE_SKILL.ticketAnswerTicket)

  const summarizeReasoningUi = reasoningUiForSkill(
    skillConfigs,
    KNOWLEDGE_SKILL.ticketSummarizeTicket
  )

  const showAnswerReasoning =
    state.reasoningCapture &&
    (answerReasoningUi.showReasoningTokens || Object.keys(skillConfigs).length === 0)

  const showSummarizeReasoning =
    state.reasoningCapture &&
    (summarizeReasoningUi.showReasoningTokens || Object.keys(skillConfigs).length === 0)

  const getShowReasoning = useCallback(
    (target: 'rcs' | 'email' | 'letter' | 'summarize') =>
      target === 'summarize' ? showSummarizeReasoning : showAnswerReasoning,
    [showAnswerReasoning, showSummarizeReasoning]
  )

  const runAnswer = useCallback(
    async (params: {
      id_reclamation: string
      id_locataire: string
      message: string
      channel?: AnswerChannel
      extraContext?: string
    }) => {
      if (!url) return null
      resetConvId()

      const payload = buildAnswerPayload({
        id_reclamation: params.id_reclamation,
        id_locataire: params.id_locataire,
        message: params.message,
        context: params.extraContext?.trim() ?? '',
        ...(params.channel ? { channel: params.channel } : {})
      })

      const result = await generate({
        url,
        conv_id: convId.current,
        payload: serializeWorkflowPayload(payload),
        id_skill: KNOWLEDGE_SKILL.ticketAnswerTicket,
        files: [],
        captureReasoning: captureReasoningForSkill(skillConfigs, KNOWLEDGE_SKILL.ticketAnswerTicket)
      })

      if (!result.ok) return null
      return { subject: result.subject, body: result.output }
    },
    [url, generate, convId, resetConvId, skillConfigs]
  )

  const runSummarize = useCallback(
    async (params: {
      id_reclamation: string
      id_locataire: string
      message: string
      activities: Activite[]
    }) => {
      if (!url) return null
      resetConvId()

      const history = timelineContext(params.activities)
      const payload = buildAnswerPayload({
        id_reclamation: params.id_reclamation,
        id_locataire: params.id_locataire,
        message: params.message,
        context: history
      })

      const result = await generate({
        url,
        conv_id: convId.current,
        payload: serializeWorkflowPayload(payload),
        id_skill: KNOWLEDGE_SKILL.ticketSummarizeTicket,
        files: [],
        captureReasoning: captureReasoningForSkill(
          skillConfigs,
          KNOWLEDGE_SKILL.ticketSummarizeTicket
        )
      })

      if (!result.ok) return null
      return result.output.trim()
    },
    [url, generate, convId, resetConvId, skillConfigs]
  )

  const generation = useMemo(
    () => ({
      isStreaming: state.isStreaming,
      isReasoningPhase: state.isReasoningPhase,
      reasoning: state.reasoning,
      output: state.output
    }),
    [state.isStreaming, state.isReasoningPhase, state.reasoning, state.output]
  )

  return {
    runAnswer,
    runSummarize,
    generation,
    getShowReasoning,
    aiBusy: state.isStreaming
  }
}
