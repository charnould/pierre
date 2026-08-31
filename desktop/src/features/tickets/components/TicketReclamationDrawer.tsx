import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useNotificationTimeline } from '@/features/activity/hooks/use-notification-timeline'
import { replyAuthorMentionSeed } from '@/features/repayment/lib/repayment-mention'
import { buildTicketTimeline } from '@/features/tickets/lib/build-ticket-timeline'
import { KNOWLEDGE_SKILL } from '@/features/tickets/lib/knowledge-skills'
import { useTicketSheetAi } from '@/features/tickets/lib/use-ticket-sheet-ai'
import type { TicketComposeMode } from '@/features/tickets/lib/use-tickets-view-data'
import { useWorkflowExport } from '@/features/workflow/hooks/useWorkflowExport'
import {
  INSPECTOR_DRAWER_CLASS,
  InspectorSplit
} from '@/shared/components/inspector/inspector-split'
import { InspectorTimelineSkeleton } from '@/shared/components/inspector/inspector-timeline-skeleton'
import { ContextTimeline } from '@/shared/components/timeline/context-timeline'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/shared/components/ui/drawer'
import { toast } from '@/shared/components/ui/toast'
import { useScrollToTopOnOpen } from '@/shared/hooks/use-scroll-to-top-on-open'
import { scrollBehavior } from '@/shared/lib/prefers-reduced-motion'
import { getTicketCellText } from '@/shared/lib/ticket-row'
import type { TicketRow } from '@/shared/types'

import {
  TicketComposeBlock,
  TicketSummaryCard,
  type TicketAiGenerationProps
} from './TicketComposeBlock'
import { TicketReclamationTimeline } from './TicketReclamationTimeline'

const EMAIL_SUBJECT_PLACEHOLDER = 'Relance — situation de compte locataire'

interface Props {
  url: string | undefined
  userLogin: string
  open: boolean
  onOpenChange: (open: boolean) => void
  sheetOpenToken: number
  /**
   * Corps seul — le parent fournit déjà le Drawer / DrawerContent
   * (ex. nested dans le centre de notifications).
   */
  embedded?: boolean
  ticket: TicketRow | null
  initialComposeMode: TicketComposeMode
  highlightActivityId?: number
  onPostActivity: (type: string, statut: string, contenu: string) => Promise<number | null>
  onSummarizeActivity: (content: string) => Promise<number | null>
}

export function TicketReclamationDrawer({
  url,
  userLogin,
  open,
  onOpenChange,
  sheetOpenToken,
  embedded = false,
  ticket,
  initialComposeMode,
  highlightActivityId,
  onPostActivity,
  onSummarizeActivity
}: Props) {
  const [composeMode, setComposeMode] = useState<TicketComposeMode>(null)
  const [comment, setComment] = useState('')
  const [rcsMessage, setRcsMessage] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [letterSubject, setLetterSubject] = useState('')
  const [letterBody, setLetterBody] = useState('')
  const [summarizeContent, setSummarizeContent] = useState('')
  const [aiComposeTarget, setAiComposeTarget] = useState<Exclude<
    TicketComposeMode,
    'comment' | null
  > | null>(null)
  const [lastHighlightId, setLastHighlightId] = useState<number | undefined>()
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const bodyScrollElRef = useRef<HTMLDivElement | null>(null)
  const historyScrollElRef = useRef<HTMLDivElement | null>(null)

  const idReclamation = ticket ? getTicketCellText(ticket, 'id_reclamation') : ''
  const idLocataire = ticket ? getTicketCellText(ticket, 'id_locataire') : ''
  const ticketMessage = ticket ? getTicketCellText(ticket, 'message') : ''

  const { rows, loading, initialLoading, refresh } = useNotificationTimeline(
    url,
    open && ticket ? 'tickets' : undefined,
    idReclamation || undefined,
    open && ticket != null
  )
  const timelineItems = useMemo(() => buildTicketTimeline(rows), [rows])
  const hasTimelineHistory = timelineItems.length > 0

  const { runAnswer, runSummarize, generation, getShowReasoning, aiBusy } = useTicketSheetAi(url)
  const { downloadDocx } = useWorkflowExport(url)

  const resetCompose = useCallback(() => {
    setComposeMode(null)
    setAiComposeTarget(null)
    setComment('')
    setRcsMessage('')
    setEmailSubject('')
    setEmailBody('')
    setLetterSubject('')
    setLetterBody('')
    setSummarizeContent('')
  }, [])

  const scrollComposeIntoView = useCallback(() => {
    const el = bodyScrollElRef.current
    if (el) el.scrollTop = 0
  }, [])

  const composeResetKey = `${idReclamation}:${sheetOpenToken}:${initialComposeMode ?? ''}:${highlightActivityId ?? ''}`
  const [seenComposeResetKey, setSeenComposeResetKey] = useState(composeResetKey)
  if (seenComposeResetKey !== composeResetKey) {
    setSeenComposeResetKey(composeResetKey)
    resetCompose()
    setComposeMode(initialComposeMode)
    setLastHighlightId(highlightActivityId)
  }

  useEffect(() => {
    const id = lastHighlightId ?? highlightActivityId
    if (!id || initialLoading) return
    const frame = window.requestAnimationFrame(() => {
      historyScrollElRef.current
        ?.querySelector(`[data-activity-id="${CSS.escape(String(id))}"]`)
        ?.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [highlightActivityId, initialLoading, lastHighlightId, timelineItems.length])

  useEffect(() => {
    if (!open || !ticket || !url || !initialComposeMode) return
    if (initialComposeMode !== 'email' && initialComposeMode !== 'letter') return

    const idSkill = KNOWLEDGE_SKILL.ticketAnswerTicket
    const channel = initialComposeMode === 'letter' ? 'letter' : 'email'

    void window.api
      ?.getTicketDraft({ url, id_reclamation: idReclamation, id_skill: idSkill })
      .then((res) => {
        const raw = res?.data
        const draft = Array.isArray(raw)
          ? raw.find((d) => (d.channel ?? 'email') === channel)
          : raw && (raw.channel ?? 'email') === channel
            ? raw
            : null
        if (!draft) return
        const body = draft.edited_output ?? draft.generated_output ?? ''
        if (initialComposeMode === 'email') setEmailBody(body)
        else setLetterBody(body)
      })
  }, [open, ticket, url, initialComposeMode, idReclamation, sheetOpenToken])

  const ticketContext = useCallback(
    () => ({
      id_reclamation: idReclamation,
      id_locataire: idLocataire,
      message: ticketMessage
    }),
    [idReclamation, idLocataire, ticketMessage]
  )

  const runTicketSubmission = async (task: () => Promise<boolean>): Promise<boolean> => {
    if (submittingRef.current) return false
    submittingRef.current = true
    setSubmitting(true)
    try {
      return await task()
    } catch {
      toast.add({ title: 'Impossible d’enregistrer la modification', type: 'error' })
      return false
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const postAndRefresh = async (type: string, statut: string, contenu: string) => {
    return runTicketSubmission(async () => {
      const activityId = await onPostActivity(type, statut, contenu)
      if (!activityId) return false
      toast.add({
        title:
          type === 'note'
            ? 'Note enregistrée dans l’historique'
            : 'Message enregistré dans l’historique',
        type: 'success'
      })
      await refresh()
      resetCompose()
      return true
    })
  }

  const sendAndRefresh = async (
    type: 'rcs' | 'email' | 'courrier',
    destinataire: string,
    contenu: { objet?: string; corps: string }
  ) => {
    return runTicketSubmission(async () => {
      if (!url || !window.api?.sendCommunication || !destinataire.trim()) {
        toast.add({ title: 'Coordonnée du destinataire indisponible', type: 'error' })
        return false
      }
      const response = await window.api.sendCommunication({
        url,
        idempotencyKey: crypto.randomUUID(),
        type,
        contexte: 'tickets',
        ref: idReclamation,
        destinataire: destinataire.trim(),
        contenu
      })
      if (!response?.data?.id) return false
      toast.add({ title: 'Message enregistré dans l’historique', type: 'success' })
      await refresh()
      resetCompose()
      return true
    })
  }

  const handleAiDraft = async (
    target: Exclude<TicketComposeMode, 'comment' | null>,
    channel: 'email' | 'letter' | undefined,
    setBody: (v: string) => void,
    setSubject: (v: string) => void
  ) => {
    const ctx = ticketContext()
    if (!ctx.id_reclamation || !ctx.message.trim()) {
      toast.add({ title: 'Message locataire requis pour la génération.', type: 'info' })
      return
    }
    setAiComposeTarget(target)
    try {
      const result = await runAnswer({
        id_reclamation: ctx.id_reclamation,
        id_locataire: ctx.id_locataire,
        message: ctx.message,
        channel
      })
      if (!result) return
      setBody(result.body)
      if (result.subject) setSubject(result.subject)
      else if (channel === 'email') {
        setSubject(EMAIL_SUBJECT_PLACEHOLDER)
      }
    } finally {
      setAiComposeTarget(null)
    }
  }

  const handleAiSummarize = async () => {
    const ctx = ticketContext()
    if (!ctx.id_reclamation || !ctx.message.trim()) {
      toast.add({ title: 'Message locataire requis pour la génération.', type: 'info' })
      return
    }
    setAiComposeTarget('summarize')
    try {
      const text = await runSummarize({
        id_reclamation: ctx.id_reclamation,
        id_locataire: ctx.id_locataire,
        message: ctx.message,
        activities: rows
      })
      if (text) setSummarizeContent(text)
    } finally {
      setAiComposeTarget(null)
    }
  }

  const aiGeneration: TicketAiGenerationProps | null = aiComposeTarget
    ? {
        target: aiComposeTarget,
        ...generation,
        showReasoning: getShowReasoning(aiComposeTarget)
      }
    : null

  const scrollToTopRef = useScrollToTopOnOpen(
    open && ticket != null,
    ticket != null ? `${idReclamation}:${sheetOpenToken}` : null
  )
  const scrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      bodyScrollElRef.current = node
      scrollToTopRef(node)
    },
    [scrollToTopRef]
  )
  const historyScrollRef = useCallback((node: HTMLDivElement | null) => {
    historyScrollElRef.current = node
  }, [])

  if (!ticket) return null

  const drawerBody = (
    <InspectorSplit
      leftRef={scrollRef}
      rightRef={historyScrollRef}
      left={
        <>
          <TicketSummaryCard ticket={ticket} />
          {initialLoading ? (
            <InspectorTimelineSkeleton variant="ticket" pane="present" />
          ) : (
            <TicketComposeBlock
              ticket={ticket}
              composeMode={composeMode}
              hasTimelineHistory={hasTimelineHistory}
              aiBusy={aiBusy}
              aiGeneration={aiGeneration}
              comment={comment}
              onCommentChange={setComment}
              rcsMessage={rcsMessage}
              onRcsMessageChange={setRcsMessage}
              emailSubject={emailSubject}
              onEmailSubjectChange={setEmailSubject}
              emailBody={emailBody}
              onEmailBodyChange={setEmailBody}
              letterSubject={letterSubject}
              onLetterSubjectChange={setLetterSubject}
              letterBody={letterBody}
              onLetterBodyChange={setLetterBody}
              summarizeContent={summarizeContent}
              onSummarizeContentChange={setSummarizeContent}
              onStartComment={() => {
                setComment('')
                setComposeMode('comment')
                scrollComposeIntoView()
              }}
              onStartRcs={() => {
                setRcsMessage('')
                setComposeMode('rcs')
              }}
              onStartEmail={() => {
                setEmailSubject('')
                setEmailBody('')
                setComposeMode('email')
              }}
              onStartLetter={() => {
                setLetterSubject('')
                setLetterBody('')
                setComposeMode('letter')
              }}
              onStartSummarize={() => {
                setSummarizeContent('')
                setComposeMode('summarize')
                void handleAiSummarize()
              }}
              onCancelCompose={resetCompose}
              onSubmitComment={() => {
                if (!comment.trim()) return
                void postAndRefresh('note', 'logged', comment.trim())
              }}
              onSummarizeDraft={() => {
                void handleAiSummarize()
              }}
              submitting={submitting}
              onSummarizeSave={() => {
                const trimmed = summarizeContent.trim()
                if (!trimmed) return
                void runTicketSubmission(async () => {
                  const activityId = await onSummarizeActivity(trimmed)
                  if (!activityId) return false
                  setLastHighlightId(activityId)
                  await refresh()
                  toast.add({ title: 'Point de situation enregistré', type: 'success' })
                  resetCompose()
                  return true
                })
              }}
              onRcsDraft={() => {
                void handleAiDraft('rcs', undefined, setRcsMessage, () => {})
              }}
              onRcsSaveDraft={() => {
                const trimmed = rcsMessage.trim()
                if (!trimmed) return
                void postAndRefresh(
                  'ticket_reply',
                  'draft',
                  JSON.stringify({ canal: 'rcs', corps: trimmed })
                )
              }}
              onRcsSend={() => {
                const trimmed = rcsMessage.trim()
                if (!trimmed) return
                const phone = String(ticket['telephone_locataire'] ?? ticket['telephone'] ?? '')
                void sendAndRefresh('rcs', phone, { corps: trimmed })
              }}
              onEmailDraft={() => {
                void handleAiDraft('email', 'email', setEmailBody, setEmailSubject)
              }}
              onEmailSaveDraft={() => {
                const trimmed = emailBody.trim()
                if (!trimmed) return
                void postAndRefresh(
                  'ticket_reply',
                  'draft',
                  JSON.stringify({
                    canal: 'email',
                    objet: emailSubject.trim(),
                    corps: trimmed
                  })
                )
              }}
              onEmailSend={() => {
                const trimmed = emailBody.trim()
                if (!trimmed) return
                const email = String(ticket['email_locataire'] ?? ticket['email'] ?? '')
                void sendAndRefresh('email', email, {
                  objet: emailSubject.trim(),
                  corps: trimmed
                })
              }}
              onLetterDraft={() => {
                void handleAiDraft('letter', 'letter', setLetterBody, setLetterSubject)
              }}
              onLetterSaveDraft={() => {
                const trimmed = letterBody.trim()
                if (!trimmed) return
                void postAndRefresh(
                  'ticket_reply',
                  'draft',
                  JSON.stringify({
                    canal: 'courrier',
                    objet: letterSubject.trim(),
                    corps: trimmed
                  })
                )
              }}
              onLetterExportWord={() => {
                const trimmed = letterBody.trim()
                if (!trimmed) return
                void downloadDocx(trimmed, KNOWLEDGE_SKILL.ticketAnswerTicket, letterSubject)
              }}
              onLetterMarkSent={() => {
                const trimmed = letterBody.trim()
                if (!trimmed) return
                const address = String(
                  ticket['adresse_locataire'] ??
                    ticket['adresse'] ??
                    ticket['adresse_reclamation'] ??
                    ''
                )
                void sendAndRefresh('courrier', address, {
                  objet: letterSubject.trim(),
                  corps: trimmed
                })
              }}
            />
          )}
        </>
      }
      right={
        initialLoading ? (
          <InspectorTimelineSkeleton variant="ticket" pane="history" />
        ) : (
          <ContextTimeline>
            <TicketReclamationTimeline
              embedded
              items={timelineItems}
              loading={loading}
              highlightId={lastHighlightId ?? highlightActivityId}
              onStartReply={(_id, auteur) => {
                setComment(replyAuthorMentionSeed(auteur, userLogin))
                setComposeMode('comment')
                scrollComposeIntoView()
              }}
            />
          </ContextTimeline>
        )
      }
    />
  )

  const drawerTitle = `Réclamation ${idReclamation}`

  if (embedded) {
    return (
      <>
        <DrawerTitle className="sr-only">{drawerTitle}</DrawerTitle>
        {drawerBody}
      </>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <DrawerContent className={INSPECTOR_DRAWER_CLASS}>
        <DrawerHeader
          data-inspector-motion="header"
          className="flex-row items-center justify-between gap-2 border-b p-3 text-start"
        >
          <div className="min-w-0 flex-1">
            <DrawerTitle>Réclamation</DrawerTitle>
            <p className="truncate text-[0.8125rem] leading-[1.125rem] tabular-nums">
              {idReclamation}
            </p>
          </div>
        </DrawerHeader>
        {drawerBody}
      </DrawerContent>
    </Drawer>
  )
}
