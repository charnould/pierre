import { useCallback, useRef } from 'react'

import { useRegisterNavigationHandlers } from '@/contexts/NavigationHistoryContext'
import { formatToWire, type TicketSkillKey } from '@/features/tickets/lib/knowledge-skills'
import type { DraftRevision } from '@/features/tickets/lib/ticket-draft-revision'
import type { WorkflowStep } from '@/features/workflow/hooks/useWorkflowPanel'
import type { NavigationSnapshot, TicketsNavigationState } from '@/shared/lib/navigation-snapshot'
import { releaseConversationVm } from '@/shared/lib/release-conversation-vm'

type Options = {
  step: WorkflowStep
  setStep: (step: WorkflowStep) => void
  ticketNumber: string
  tenantNumber: string
  message: string
  context: string
  ticketFormat: TicketSkillKey
  setTicketNumber: (value: string) => void
  setTenantNumber: (value: string) => void
  setMessage: (value: string) => void
  setContext: (value: string) => void
  setTicketFormat: (format: TicketSkillKey) => void
  draftRevision: DraftRevision
  draftVariants: { generated: { body: string; subject: string } } | null
  url: string | undefined
  convId: React.MutableRefObject<string>
  cancel: () => void
  resetConvId: () => void
  clearOutputAndDrafts: () => void
  loadAvailableTicketDraft: (
    id_reclamation: string,
    preferredFormat: TicketSkillKey,
    preferredRevision?: DraftRevision
  ) => Promise<boolean>
  saveEditedDraft: () => Promise<boolean>
  pendingDraftIdSkillRef: React.MutableRefObject<string | null>
}

export function useTicketsNavigation({
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
  url,
  convId,
  cancel,
  resetConvId,
  clearOutputAndDrafts,
  loadAvailableTicketDraft,
  saveEditedDraft,
  pendingDraftIdSkillRef
}: Options) {
  const buildTicketsSnapshot = useCallback(
    (snapshotStep: TicketsNavigationState['step']): TicketsNavigationState => ({
      step: snapshotStep,
      ticketNumber,
      tenantNumber,
      message,
      context,
      ticketFormat,
      ...(snapshotStep === 'output' && draftVariants ? { draftRevision } : {})
    }),
    [ticketNumber, tenantNumber, message, context, ticketFormat, draftRevision, draftVariants]
  )

  const saveEditedDraftRef = useRef(saveEditedDraft)
  saveEditedDraftRef.current = saveEditedDraft

  const loadAvailableTicketDraftRef = useRef(loadAvailableTicketDraft)
  loadAvailableTicketDraftRef.current = loadAvailableTicketDraft

  const clearOutputAndDraftsRef = useRef(clearOutputAndDrafts)
  clearOutputAndDraftsRef.current = clearOutputAndDrafts

  const resetConvIdRef = useRef(resetConvId)
  resetConvIdRef.current = resetConvId

  const urlRef = useRef(url)
  urlRef.current = url

  const convIdRef = useRef(convId)
  convIdRef.current = convId

  const cancelRef = useRef(cancel)
  cancelRef.current = cancel

  const applyTicketsSnapshot = useCallback(
    async (snapshot: NavigationSnapshot) => {
      const ticketsState = snapshot.tickets
      if (!ticketsState) {
        setStep('form')
        return
      }

      setTicketNumber(ticketsState.ticketNumber)
      setTenantNumber(ticketsState.tenantNumber)
      setMessage(ticketsState.message)
      setContext(ticketsState.context)
      setTicketFormat(ticketsState.ticketFormat)
      setStep(ticketsState.step)

      if (ticketsState.step === 'output') {
        clearOutputAndDraftsRef.current()
        resetConvIdRef.current()
        if (ticketsState.ticketNumber.trim()) {
          pendingDraftIdSkillRef.current = formatToWire(ticketsState.ticketFormat).id_skill
          await loadAvailableTicketDraftRef.current(
            ticketsState.ticketNumber.trim(),
            ticketsState.ticketFormat,
            ticketsState.draftRevision
          )
        }
      }
    },
    [
      setStep,
      setTicketNumber,
      setTenantNumber,
      setMessage,
      setContext,
      setTicketFormat,
      pendingDraftIdSkillRef
    ]
  )

  useRegisterNavigationHandlers('tickets', {
    getSnapshot: () => ({
      tickets: buildTicketsSnapshot(step)
    }),
    applySnapshot: applyTicketsSnapshot,
    beforeLeave: async (leaving) => {
      if (leaving.tickets?.step === 'output') {
        await saveEditedDraftRef.current()
      }
      cancelRef.current()
      releaseConversationVm(urlRef.current, convIdRef.current.current)
    }
  })
}
