import ticketConfig from '@customization/tickets/config'
import { X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'

import { useNotificationTimeline } from '@/features/activity/hooks/use-notification-timeline'
import { buildTicketTimeline } from '@/features/tickets/lib/build-ticket-timeline'
import { KNOWLEDGE_SKILL } from '@/features/tickets/lib/knowledge-skills'
import {
  NON_TRAITEES_TICKET_BUCKET_ID,
  isTicketBucketId,
  resolveTicketBucket,
  type TicketBucketId
} from '@/features/tickets/lib/ticket-bucket'
import {
  getTicketExternalApplication,
  resolveTicketExternalApplicationUrl
} from '@/features/tickets/lib/ticket-external-application'
import { canonicalizeTicketTags, TICKET_TAG_OPTIONS } from '@/features/tickets/lib/ticket-tags'
import { useTicketSheetAi } from '@/features/tickets/lib/use-ticket-sheet-ai'
import type { TicketComposeMode } from '@/features/tickets/lib/use-tickets-view-data'
import { useWorkflowExport } from '@/features/workflow/hooks/useWorkflowExport'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import {
  INSPECTOR_DRAWER_CLASS,
  InspectorSplit
} from '@/shared/components/inspector/inspector-split'
import { InspectorTimelineSkeleton } from '@/shared/components/inspector/inspector-timeline-skeleton'
import { OpenActionsCard } from '@/shared/components/inspector/open-actions-card'
import { ContextTimeline } from '@/shared/components/timeline/context-timeline'
import { Button } from '@/shared/components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/shared/components/ui/drawer'
import { toast } from '@/shared/components/ui/toast'
import { useCaseActivityActions } from '@/shared/hooks/use-case-activity-actions'
import { useScrollToTopOnOpen } from '@/shared/hooks/use-scroll-to-top-on-open'
import { listOpenActions, type ActionDraft } from '@/shared/lib/activities/action-activity'
import {
  deriveCaseAssignment,
  deriveCaseBucket,
  deriveCaseTags
} from '@/shared/lib/activities/case-activities'
import { replyAuthorMentionSeed } from '@/shared/lib/activities/mentions'
import { scrollBehavior } from '@/shared/lib/prefers-reduced-motion'
import { getTicketCellText } from '@/shared/lib/ticket-row'
import type { TicketRow } from '@/shared/types'
import { activity_texte, type Activite } from '@/shared/types/activites'
import type { OrgUser } from '@/shared/types/users'

import {
  TicketComposeBlock,
  TicketSummaryCard,
  type TicketAiGenerationProps
} from './TicketComposeBlock'
import { TicketReclamationTimeline } from './TicketReclamationTimeline'
import type { TicketReplyFormat } from './TicketTenantReplyDraft'

const EMAIL_SUBJECT_PLACEHOLDER = 'Relance — situation de compte locataire'
const EXTERNAL_APPLICATION = getTicketExternalApplication(ticketConfig)

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
  onCaseStateChange?: () => void | Promise<void>
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
  onSummarizeActivity,
  onCaseStateChange
}: Props) {
  const [composeMode, setComposeMode] = useState<TicketComposeMode>(null)
  const [comment, setComment] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [deleteActivityId, setDeleteActivityId] = useState<number | null>(null)
  const [draftTags, setDraftTags] = useState<string[]>([])
  const [tagComment, setTagComment] = useState('')
  const [draftBucket, setDraftBucket] = useState<TicketBucketId | null>(null)
  const [bucketComment, setBucketComment] = useState('')
  const [rcsMessage, setRcsMessage] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [letterSubject, setLetterSubject] = useState('')
  const [letterBody, setLetterBody] = useState('')
  const [externalSubject, setExternalSubject] = useState('')
  const [externalBody, setExternalBody] = useState('')
  const [externalConfirmation, setExternalConfirmation] = useState<{
    applicationName: string
    subject: string
    message: string
    destinataire?: string
  } | null>(null)
  const [summarizeContent, setSummarizeContent] = useState('')
  const [aiComposeTarget, setAiComposeTarget] = useState<Extract<
    TicketComposeMode,
    'rcs' | 'email' | 'letter' | 'external' | 'summarize'
  > | null>(null)
  const [lastHighlightId, setLastHighlightId] = useState<number | undefined>()
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const bodyScrollElRef = useRef<HTMLDivElement | null>(null)
  const historyScrollElRef = useRef<HTMLDivElement | null>(null)

  const idReclamation = ticket ? getTicketCellText(ticket, 'id_reclamation') : ''
  const idLocataire = ticket
    ? getTicketCellText(ticket, 'id_locataire') ||
      getTicketCellText(ticket, 'ids_locataires_concernes')
    : ''
  const ticketMessage = ticket
    ? getTicketCellText(ticket, 'message_initial') || getTicketCellText(ticket, 'message')
    : ''

  const { rows, loading, initialLoading, refresh } = useNotificationTimeline(
    url,
    open && ticket ? 'tickets' : undefined,
    idReclamation || undefined,
    open && ticket != null
  )
  const timelineItems = useMemo(() => buildTicketTimeline(rows, ticket), [rows, ticket])
  const hasTimelineHistory = timelineItems.length > 0
  const sortedActivities = useMemo(
    () => [...rows].sort((a, b) => b.date_creation.localeCompare(a.date_creation)),
    [rows]
  )
  const currentTags = useMemo(
    () => canonicalizeTicketTags(deriveCaseTags(sortedActivities)),
    [sortedActivities]
  )
  const currentBucket = useMemo(
    () =>
      resolveTicketBucket(
        deriveCaseBucket(
          sortedActivities,
          resolveTicketBucket(
            typeof ticket?.pierre_bucket === 'string'
              ? ticket.pierre_bucket
              : NON_TRAITEES_TICKET_BUCKET_ID
          ),
          isTicketBucketId
        )
      ),
    [sortedActivities, ticket]
  )
  const currentReferent = useMemo(
    () => deriveCaseAssignment(sortedActivities, getTicketCellText(ticket ?? {}, 'affectation_1')),
    [sortedActivities, ticket]
  )
  const currentActionRows = useMemo(() => {
    const latestRevision = new Map<string, Activite>()
    for (const row of rows) {
      if (row.type !== 'action' || !row.thread_id) continue
      const previous = latestRevision.get(row.thread_id)
      if (!previous || (row.revision ?? 0) > (previous.revision ?? 0)) {
        latestRevision.set(row.thread_id, row)
      }
    }
    return [...latestRevision.values()]
  }, [rows])
  const openActions = useMemo(() => listOpenActions(currentActionRows), [currentActionRows])

  const caseActions = useCaseActivityActions({
    url,
    contexte: 'tickets',
    ref: idReclamation,
    userLogin,
    refresh
  })

  const { runAnswer, runSummarize, generation, getShowReasoning, aiBusy } = useTicketSheetAi(url)
  const { downloadDocx } = useWorkflowExport(url)

  const resetCompose = useCallback(() => {
    setComposeMode(null)
    setAiComposeTarget(null)
    setComment('')
    setEditingNoteId(null)
    setDraftTags([])
    setTagComment('')
    setDraftBucket(null)
    setBucketComment('')
    setRcsMessage('')
    setEmailSubject('')
    setEmailBody('')
    setLetterSubject('')
    setLetterBody('')
    setExternalSubject('')
    setExternalBody('')
    setExternalConfirmation(null)
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

  const recordExternalAndRefresh = async (
    applicationName: string,
    destinataire: string | undefined,
    subject: string,
    message: string
  ) => {
    return runTicketSubmission(async () => {
      if (!url || !window.api?.recordExternalCommunication) return false
      const response = await window.api.recordExternalCommunication({
        url,
        idempotencyKey: crypto.randomUUID(),
        canal: 'email',
        contexte: 'tickets',
        ref: idReclamation,
        ...(destinataire?.trim() ? { destinataire: destinataire.trim() } : {}),
        contenu: {
          ...(subject ? { objet: subject } : {}),
          corps: message,
          tenant_reply: true,
          external_application: { name: applicationName }
        }
      })
      if (!response?.data?.id) {
        toast.add({ title: 'Impossible d’enregistrer le message', type: 'error' })
        return false
      }
      toast.add({ title: 'Message enregistré dans l’historique', type: 'success' })
      await refresh()
      resetCompose()
      return true
    })
  }

  const handleAiDraft = async (
    target: Extract<TicketComposeMode, 'rcs' | 'email' | 'letter' | 'external'>,
    channel: 'sms' | 'email' | 'letter',
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

  const handleExternalInjection = async () => {
    if (!ticket || composeMode !== 'external' || !EXTERNAL_APPLICATION) return
    const message = externalBody.trim()
    const subject = externalSubject.trim()
    const destinataire = String(ticket['email_locataire'] ?? ticket['email'] ?? '')
    const externalUrl = resolveTicketExternalApplicationUrl(EXTERNAL_APPLICATION.urlPattern, ticket)
    if (!externalUrl || !message || !window.api?.openTicketExternalApplication) {
      toast.add({
        title: `Impossible d’ouvrir ${EXTERNAL_APPLICATION.name}`,
        type: 'error'
      })
      return
    }

    let injected = false
    try {
      injected = await window.api.openTicketExternalApplication({
        url: externalUrl,
        message,
        selector: EXTERNAL_APPLICATION.messageSelector
      })
    } catch {
      injected = false
    }
    if (!injected) {
      toast.add({
        title: `Impossible d’injecter la réponse dans ${EXTERNAL_APPLICATION.name}`,
        type: 'error'
      })
      return
    }
    setExternalConfirmation({
      applicationName: EXTERNAL_APPLICATION.name,
      subject,
      message,
      ...(destinataire.trim() ? { destinataire: destinataire.trim() } : {})
    })
  }

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
        <div className="flex min-h-full flex-col">
          <TicketSummaryCard
            ticket={ticket}
            tags={currentTags}
            referent={currentReferent.email}
            bucket={currentBucket}
          />
          <OpenActionsCard
            actions={openActions}
            saving={caseActions.submitting === 'action'}
            userLogin={userLogin}
            url={url}
            onComplete={(id) => void caseActions.patchAction(id, { operation: 'complete_action' })}
            onIgnore={(id, motif) =>
              void caseActions.patchAction(id, {
                operation: 'ignore_action',
                ...(motif.trim() ? { motif: motif.trim() } : {})
              })
            }
            onEdit={(id, values) =>
              void caseActions.patchAction(id, {
                operation: 'update_action',
                action: values.action,
                assigne_a: values.assigneA,
                date_echeance: values.dateEcheance,
                ...(values.note.trim() ? { note: values.note.trim() } : {})
              })
            }
            onDelete={setDeleteActivityId}
            className="mb-3"
          />
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
              externalSubject={externalSubject}
              onExternalSubjectChange={setExternalSubject}
              externalBody={externalBody}
              onExternalBodyChange={setExternalBody}
              summarizeContent={summarizeContent}
              onSummarizeContentChange={setSummarizeContent}
              onStartComment={() => {
                setComment('')
                setEditingNoteId(null)
                setComposeMode('comment')
                scrollComposeIntoView()
              }}
              onStartTodo={() => setComposeMode('todo')}
              onStartAction={() => setComposeMode('action')}
              onStartBucket={() => {
                setDraftBucket(currentBucket)
                setBucketComment('')
                setComposeMode('bucket')
              }}
              onStartTags={() => {
                setDraftTags(currentTags)
                setTagComment('')
                setComposeMode('tags')
              }}
              onStartAssignment={() => {
                setTagComment('')
                setComposeMode('assignment')
              }}
              onStartReply={() => {
                if (EXTERNAL_APPLICATION) {
                  setExternalSubject('')
                  setExternalBody('')
                  setComposeMode('external')
                } else {
                  setEmailSubject('')
                  setEmailBody('')
                  setComposeMode('email')
                }
              }}
              onReplyFormatChange={(format: TicketReplyFormat) => setComposeMode(format)}
              onStartSummarize={() => {
                setSummarizeContent('')
                setComposeMode('summarize')
                void handleAiSummarize()
              }}
              onCancelCompose={resetCompose}
              onSubmitComment={() => {
                if (!comment.trim()) return
                if (editingNoteId != null) {
                  void caseActions.editNote(editingNoteId, comment).then((ok) => {
                    if (ok) resetCompose()
                  })
                } else {
                  void postAndRefresh(
                    'note',
                    'logged',
                    JSON.stringify({ version: 1, note: comment.trim() })
                  )
                }
              }}
              onSubmitAction={(draft: ActionDraft) =>
                caseActions.createAction(draft).then((ok) => {
                  if (ok) resetCompose()
                  return ok
                })
              }
              draftBucket={draftBucket}
              currentBucket={currentBucket}
              onDraftBucketChange={setDraftBucket}
              bucketComment={bucketComment}
              onBucketCommentChange={setBucketComment}
              onSubmitBucket={() => {
                if (!draftBucket) return
                void caseActions
                  .saveBucket(draftBucket, currentBucket, bucketComment)
                  .then(async (ok) => {
                    if (!ok) return
                    resetCompose()
                    await onCaseStateChange?.()
                  })
              }}
              draftTags={draftTags}
              currentTags={currentTags}
              onDraftTagsChange={setDraftTags}
              tagComment={tagComment}
              onTagCommentChange={setTagComment}
              onSubmitTags={() => {
                void caseActions
                  .saveTags(draftTags, currentTags, tagComment, TICKET_TAG_OPTIONS)
                  .then((ok) => {
                    if (ok) resetCompose()
                  })
              }}
              onAssignReferent={(user: OrgUser) => {
                void caseActions
                  .assignReferent(user, currentReferent.email, tagComment)
                  .then((ok) => {
                    if (ok) resetCompose()
                  })
              }}
              onImportEml={(file) => void caseActions.importEml(file)}
              url={url}
              onSummarizeDraft={() => {
                void handleAiSummarize()
              }}
              submitting={submitting || caseActions.submitting != null}
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
                void handleAiDraft('rcs', 'sms', setRcsMessage, () => {})
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
              onLetterExportWord={() => {
                const trimmed = letterBody.trim()
                if (!trimmed) return
                void downloadDocx(trimmed, KNOWLEDGE_SKILL.ticketAnswerTicket, letterSubject)
              }}
              onLetterSend={() => {
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
              onExternalDraft={() => {
                if (!EXTERNAL_APPLICATION) return
                void handleAiDraft('external', 'email', setExternalBody, setExternalSubject)
              }}
              onExternalInject={() => void handleExternalInjection()}
            />
          )}
        </div>
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
              userLogin={userLogin}
              onStartReply={(_id, auteur) => {
                setComment(replyAuthorMentionSeed(auteur, userLogin))
                setComposeMode('comment')
                scrollComposeIntoView()
              }}
              onStartEditNote={(row) => {
                setEditingNoteId(row.id)
                setComment(activity_texte(row.type, row.contenu))
                setComposeMode('comment')
                scrollComposeIntoView()
              }}
              onDeleteActivity={setDeleteActivityId}
              onReopenAction={(id, assigneA, dateEcheance) =>
                void caseActions.patchAction(id, {
                  operation: 'reopen_action',
                  assigne_a: assigneA,
                  date_echeance: dateEcheance
                })
              }
            />
          </ContextTimeline>
        )
      }
    />
  )

  const handleClose = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onOpenChange(false)
  }
  const drawerHeader = (
    <DrawerHeader
      data-inspector-motion="header"
      className="flex-row items-center justify-between gap-2 border-b px-4 py-2 text-start"
    >
      <div className="min-w-0 flex-1">
        <DrawerTitle>Réclamation</DrawerTitle>
        <p className="truncate text-[0.8125rem] leading-5 tabular-nums">{idReclamation}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="no-drag"
        aria-label="Fermer le dossier"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={handleClose}
      >
        <X aria-hidden />
      </Button>
    </DrawerHeader>
  )
  const deleteDialog = (
    <ConfirmDialog
      open={deleteActivityId != null}
      title="Supprimer définitivement"
      description="Cette action est irréversible. Tout le fil disparaîtra de l’historique."
      confirmLabel="Supprimer"
      confirmVariant="destructive"
      onCancel={() => setDeleteActivityId(null)}
      onConfirm={() => {
        if (deleteActivityId == null) return
        void caseActions.deleteActivity(deleteActivityId).then((ok) => {
          if (ok) setDeleteActivityId(null)
        })
      }}
    />
  )
  const externalApplicationDialog = (
    <ConfirmDialog
      open={externalConfirmation != null}
      title={`Avez-vous envoyé cette réponse avec ${externalConfirmation?.applicationName ?? ''} ?`}
      description={
        externalConfirmation?.subject
          ? `Objet : ${externalConfirmation.subject}`
          : 'Confirmez l’envoi pour l’enregistrer dans l’historique du dossier.'
      }
      confirmLabel="Oui, enregistrer"
      cancelLabel="Non"
      onCancel={() => setExternalConfirmation(null)}
      onConfirm={() => {
        if (!externalConfirmation) return
        const { applicationName, subject, message, destinataire } = externalConfirmation
        void recordExternalAndRefresh(applicationName, destinataire, subject, message)
      }}
    />
  )

  if (embedded) {
    return (
      <>
        {drawerHeader}
        {drawerBody}
        {externalApplicationDialog}
        {deleteDialog}
      </>
    )
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
        <DrawerContent className={INSPECTOR_DRAWER_CLASS}>
          {drawerHeader}
          {drawerBody}
        </DrawerContent>
      </Drawer>
      {externalApplicationDialog}
      {deleteDialog}
    </>
  )
}
