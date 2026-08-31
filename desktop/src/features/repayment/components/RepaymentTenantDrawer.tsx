import { X } from 'lucide-react'
import type { MouseEvent } from 'react'
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  INSPECTOR_DRAWER_CLASS,
  InspectorSplit
} from '@/shared/components/inspector/inspector-split'
import { InspectorTimelineSkeleton } from '@/shared/components/inspector/inspector-timeline-skeleton'
import { ContextTimeline } from '@/shared/components/timeline/context-timeline'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/shared/components/ui/drawer'
import { toast } from '@/shared/components/ui/toast'
import { useScrollToTopOnOpen } from '@/shared/hooks/use-scroll-to-top-on-open'
import { scrollBehavior } from '@/shared/lib/prefers-reduced-motion'
import type { ColumnValuesConfig } from '@/shared/lib/ui-settings/tickets-table'
import { activity_texte, type Activite } from '@/shared/types/activites'
import type { RepaymentNotificationChannel } from '@/shared/types/notification-repayment'
import type { OrgUser } from '@/shared/types/users'

import { useRepaymentComposeState } from '../hooks/use-repayment-compose-state'
import { useRepaymentOutboundState } from '../hooks/use-repayment-outbound-state'
import { useRepaymentTenantActions } from '../hooks/use-repayment-tenant-actions'
import { useRepaymentTenantTimeline } from '../hooks/use-repayment-tenant-timeline'
import { debtEpisodeTrend } from '../lib/build-tenant-balance-series'
import type { TenantRepaymentRow } from '../lib/classify-tenants'
import type { OutboundEmailResolved, OutboundRcsResolved } from '../lib/outbound-email-templates'
import { listOpenRepaymentActions } from '../lib/repayment-action-activity'
import type {
  RepaymentAdvancementContext,
  RepaymentMessageOptions
} from '../lib/repayment-activity-mutations'
import { sortRepaymentActivitiesDesc } from '../lib/repayment-activity-order'
import { latestActiveRepaymentPlan } from '../lib/repayment-activity-text'
import {
  deriveRepaymentAdvancementFromSorted,
  deriveRepaymentGestionnaireFromSorted
} from '../lib/repayment-advancement'
import type { RepaymentBucketId } from '../lib/repayment-bucket'
import { replyAuthorMentionSeed } from '../lib/repayment-mention'
import { deriveRepaymentTagsFromSorted } from '../lib/repayment-tags'
import { actionForTemplate } from '../lib/repayment-template-actions'
import { RepaymentComposeBlock } from './RepaymentComposeBlock'
import { RepaymentOpenActionsCard } from './RepaymentOpenActionsCard'
import { RepaymentTenantTimeline } from './RepaymentTenantTimeline'
import { TenantSnapshotCard } from './TenantSnapshotCard'

const INITIAL_TIMELINE_VISIBLE = 30

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
  tenant: TenantRepaymentRow | null
  columnValues?: ColumnValuesConfig
  highlightActivityId?: number
  onAddNote: (
    comment: string,
    channel: RepaymentNotificationChannel,
    options?: RepaymentMessageOptions
  ) => boolean | Promise<boolean>
  onAdvancementChange: (
    bucket: RepaymentBucketId | null,
    comment: string,
    context: RepaymentAdvancementContext
  ) => boolean | Promise<boolean>
  onTagsChange: (
    tags: string[],
    previousTags: string[],
    comment?: string
  ) => boolean | Promise<boolean>
  onAssignGestionnaire?: (
    user: OrgUser,
    previousEmail: string | null,
    comment?: string
  ) => boolean | Promise<boolean>
  gestionnaireAssignable?: boolean
  onCreatePlan: (tenant: TenantRepaymentRow) => void
  onEditPlan?: (tenant: TenantRepaymentRow, row: Activite) => void
}

export function RepaymentTenantDrawer({
  url,
  userLogin,
  open,
  onOpenChange,
  sheetOpenToken,
  embedded = false,
  tenant,
  columnValues,
  highlightActivityId,
  onAddNote,
  onAdvancementChange,
  onTagsChange,
  onAssignGestionnaire,
  gestionnaireAssignable = false,
  onCreatePlan,
  onEditPlan
}: Props) {
  const [assigningGestionnaire, setAssigningGestionnaire] = useState(false)
  const [contentReady, setContentReady] = useState(false)
  const [timelineVisibleCount, setTimelineVisibleCount] = useState(INITIAL_TIMELINE_VISIBLE)
  const [nowIso, setNowIso] = useState(() => new Date().toISOString())
  const bodyScrollElRef = useRef<HTMLDivElement | null>(null)
  const historyScrollElRef = useRef<HTMLDivElement | null>(null)

  const {
    entries: timelineEntries,
    notifications,
    openActionEvents,
    episode,
    initialLoading: timelineInitialLoading,
    loadingMovements,
    movementsError,
    refresh: refreshTimeline,
    applyActivityPatch
  } = useRepaymentTenantTimeline(
    url,
    tenant?.id_client,
    tenant?.id_locataire,
    open && tenant != null,
    tenant?.solde_locataire
  )

  const sortedActivities = useMemo(
    () => sortRepaymentActivitiesDesc(notifications),
    [notifications]
  )
  const { advancement, currentGestionnaire, currentTags } = useMemo(
    () => ({
      advancement: deriveRepaymentAdvancementFromSorted(sortedActivities),
      currentGestionnaire: deriveRepaymentGestionnaireFromSorted(sortedActivities),
      currentTags: deriveRepaymentTagsFromSorted(sortedActivities)
    }),
    [sortedActivities]
  )
  const activePlan = useMemo(() => latestActiveRepaymentPlan(notifications), [notifications])
  const {
    mode: composeMode,
    bucket: draftBucket,
    tags: draftTags,
    comment: draftComment,
    editingNoteId,
    epoch: composeEpoch,
    canSaveAdvancement,
    canSaveTags,
    reset: resetCompose,
    setBucket: setDraftBucket,
    setTags: setDraftTags,
    setComment: setDraftComment,
    startAction,
    startAdvancement,
    startAssignment,
    startEmail,
    startEditNote,
    startNote,
    startRcs,
    startTags,
    startTodo
  } = useRepaymentComposeState(advancement, currentTags)
  const onEmailOpenError = useCallback(() => {
    toast.add({ title: 'Impossible d’ouvrir le client mail', type: 'error' })
  }, [])
  const {
    clearEmailReview,
    clearPendingMailto,
    clearRcsReview,
    emailBody,
    emailConfirmOpen,
    emailSubject,
    pendingEmailTemplateId,
    pendingEmailTo,
    pendingMailto,
    pendingRcsTemplateId,
    reset: resetOutbound,
    selectEmailTemplate,
    selectMailtoTemplate,
    selectRcsTemplate,
    setEmailBody,
    setEmailSubject,
    setRcsMessage,
    rcsMessage
  } = useRepaymentOutboundState(onEmailOpenError)
  const {
    submitting,
    deleteTarget,
    deletingNote,
    runSubmission,
    afterSuccessfulWrite,
    handleEditNote,
    handleRequestDeleteNote,
    handleConfirmDeleteNote,
    handleBoost,
    handleSubmitAction,
    patchAction,
    handleReopenAction,
    handleEditAction,
    handleImportEml,
    cancelDelete
  } = useRepaymentTenantActions({
    url,
    tenant,
    userLogin,
    refreshTimeline,
    applyActivityPatch
  })

  const visibleTimelineEntries = useMemo(
    () => timelineEntries.slice(0, timelineVisibleCount),
    [timelineEntries, timelineVisibleCount]
  )
  const openActions = useMemo(() => listOpenRepaymentActions(openActionEvents), [openActionEvents])

  const scrollComposeIntoView = useCallback(() => {
    const el = bodyScrollElRef.current
    if (el) el.scrollTop = 0
  }, [])

  const [seenTenantId, setSeenTenantId] = useState(tenant?.id_locataire)
  const tenantId = tenant?.id_locataire
  if (tenantId !== seenTenantId) {
    setSeenTenantId(tenantId)
    setAssigningGestionnaire(false)
    setContentReady(false)
    setTimelineVisibleCount(INITIAL_TIMELINE_VISIBLE)
    resetCompose()
    resetOutbound()
  }

  const [seenOpenToken, setSeenOpenToken] = useState(sheetOpenToken)
  if (!open && contentReady) {
    setContentReady(false)
  } else if (open && seenOpenToken !== sheetOpenToken) {
    setSeenOpenToken(sheetOpenToken)
    setContentReady(true)
  } else if (open && !contentReady) {
    setContentReady(true)
  }

  const handleDrawerOpenChangeComplete = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setContentReady(false)
      setTimelineVisibleCount(INITIAL_TIMELINE_VISIBLE)
      return
    }

    startTransition(() => {
      setNowIso(new Date().toISOString())
      setContentReady(true)
    })
  }, [])

  useEffect(() => {
    if (!contentReady || timelineInitialLoading) return
    if (timelineVisibleCount >= timelineEntries.length) return

    const expand = () => {
      startTransition(() => setTimelineVisibleCount(timelineEntries.length))
    }

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(expand, { timeout: 400 })
      return () => window.cancelIdleCallback(idleId)
    }

    const timeoutId = window.setTimeout(expand, 0)
    return () => window.clearTimeout(timeoutId)
  }, [contentReady, timelineEntries.length, timelineInitialLoading, timelineVisibleCount])

  useEffect(() => {
    if (!highlightActivityId || !contentReady || timelineInitialLoading) return
    const frame = window.requestAnimationFrame(() => {
      historyScrollElRef.current
        ?.querySelector(`[data-activity-id="${CSS.escape(String(highlightActivityId))}"]`)
        ?.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [contentReady, highlightActivityId, timelineInitialLoading, timelineVisibleCount])

  const handleStartNote = useCallback(() => {
    startNote()
    scrollComposeIntoView()
  }, [scrollComposeIntoView, startNote])

  const handleStartReply = useCallback(
    (_activityId: number, auteur: string) => {
      startNote(replyAuthorMentionSeed(auteur, userLogin))
      scrollComposeIntoView()
    },
    [scrollComposeIntoView, startNote, userLogin]
  )

  const handleStartEditNote = useCallback(
    (row: Activite) => {
      clearRcsReview()
      clearEmailReview()
      startEditNote(row.id, activity_texte(row.type, row.contenu))
      scrollComposeIntoView()
    },
    [clearEmailReview, clearRcsReview, scrollComposeIntoView, startEditNote]
  )

  const focusComposeVerbs = useCallback(() => {
    const focus = () =>
      document.querySelector<HTMLElement>('[data-inspector-compose-verbs] button')?.focus()
    requestAnimationFrame(() => requestAnimationFrame(focus))
  }, [])

  const handleAssignGestionnaireSubmit = useCallback(
    (user: OrgUser) => {
      if (!onAssignGestionnaire) return
      void runSubmission('assignment', async (isCurrent) => {
        setAssigningGestionnaire(true)
        try {
          const ok = await onAssignGestionnaire(user, currentGestionnaire.email, draftComment)
          if (!ok) return false
          await afterSuccessfulWrite(isCurrent)
          if (!isCurrent()) return true
          toast.add({ title: 'Référent affecté', type: 'success' })
          resetCompose()
          return true
        } finally {
          if (isCurrent()) setAssigningGestionnaire(false)
        }
      })
    },
    [
      currentGestionnaire.email,
      draftComment,
      afterSuccessfulWrite,
      onAssignGestionnaire,
      resetCompose,
      runSubmission
    ]
  )

  const handleConfirmEmailSent = useCallback(() => {
    const email = pendingMailto
    if (!email) return
    void runSubmission('email', async (isCurrent) => {
      const { templateId, subject, body } = email
      const action = actionForTemplate(templateId)
      if (!action) return false
      const ok = await onAddNote(body, 'email', {
        objet: subject,
        action,
        destinataire: email.toAddress,
        transport: 'mailto'
      })
      if (!ok) return false
      await afterSuccessfulWrite(isCurrent)
      if (!isCurrent()) return true
      toast.add({ title: 'Message enregistré dans l’historique', type: 'success' })
      clearPendingMailto()
      return true
    })
  }, [clearPendingMailto, afterSuccessfulWrite, onAddNote, pendingMailto, runSubmission])

  const handleSubmitActionCompose = useCallback(
    async (draft: Parameters<typeof handleSubmitAction>[0]) => {
      const ok = await handleSubmitAction(draft)
      if (ok) resetCompose()
      return ok
    },
    [handleSubmitAction, resetCompose]
  )

  const handleSubmitNote = useCallback(
    (comment?: string) => {
      const text = (typeof comment === 'string' ? comment : draftComment).trim()
      if (!text || !tenant) return
      if (editingNoteId != null) {
        void runSubmission('note', async (isCurrent) => {
          const ok = await handleEditNote(editingNoteId, text)
          if (!ok) return false
          if (!isCurrent()) return true
          resetCompose()
          focusComposeVerbs()
          return true
        })
        return
      }
      void runSubmission('note', async (isCurrent) => {
        const ok = await onAddNote(text, 'note')
        if (!ok) return false
        await afterSuccessfulWrite(isCurrent)
        if (!isCurrent()) return true
        toast.add({ title: 'Note enregistrée dans l’historique', type: 'success' })
        resetCompose()
        focusComposeVerbs()
        return true
      })
    },
    [
      afterSuccessfulWrite,
      draftComment,
      editingNoteId,
      focusComposeVerbs,
      handleEditNote,
      onAddNote,
      resetCompose,
      runSubmission,
      tenant
    ]
  )

  const handleSubmitAdvancement = useCallback(() => {
    void runSubmission('advancement', async (isCurrent) => {
      const ok = await onAdvancementChange(draftBucket, draftComment, {
        previousBucket: advancement.bucket,
        id_locataire: tenant?.id_locataire
      })
      await afterSuccessfulWrite(isCurrent)
      if (!ok) return false
      if (!isCurrent()) return true
      toast.add({ title: 'Avancement enregistré', type: 'success' })
      resetCompose()
      return true
    })
  }, [
    advancement.bucket,
    draftBucket,
    draftComment,
    afterSuccessfulWrite,
    onAdvancementChange,
    resetCompose,
    runSubmission,
    tenant?.id_locataire
  ])

  const handleStartTags = useCallback(() => {
    startTags()
    scrollComposeIntoView()
  }, [scrollComposeIntoView, startTags])

  const handleSubmitTags = useCallback(() => {
    void runSubmission('tags', async (isCurrent) => {
      const ok = await onTagsChange(draftTags, currentTags, draftComment)
      await afterSuccessfulWrite(isCurrent)
      if (!ok) return false
      if (!isCurrent()) return true
      toast.add({ title: 'Tags enregistrés', type: 'success' })
      resetCompose()
      return true
    })
  }, [
    currentTags,
    draftComment,
    draftTags,
    afterSuccessfulWrite,
    onTagsChange,
    resetCompose,
    runSubmission
  ])

  const handleSubmitRcs = useCallback(() => {
    const trimmed = rcsMessage.trim()
    if (!trimmed || !tenant) return
    const action = pendingRcsTemplateId ? actionForTemplate(pendingRcsTemplateId) : null
    if (!action) return
    void runSubmission('rcs', async (isCurrent) => {
      const destinataire =
        typeof tenant.telephone_client === 'string' ? tenant.telephone_client : undefined
      const ok = await onAddNote(trimmed, 'rcs', { action, destinataire })
      if (!ok) return false
      await afterSuccessfulWrite(isCurrent)
      if (!isCurrent()) return true
      toast.add({ title: 'Message enregistré dans l’historique', type: 'success' })
      clearRcsReview()
      resetCompose()
      return true
    })
  }, [
    clearRcsReview,
    afterSuccessfulWrite,
    onAddNote,
    pendingRcsTemplateId,
    resetCompose,
    runSubmission,
    rcsMessage,
    tenant
  ])

  const handleSubmitEmail = useCallback(() => {
    const trimmed = emailBody.trim()
    if (!trimmed) return
    const action = pendingEmailTemplateId ? actionForTemplate(pendingEmailTemplateId) : null
    if (!action) return
    void runSubmission('email', async (isCurrent) => {
      const ok = await onAddNote(trimmed, 'email', {
        action,
        objet: emailSubject,
        destinataire: pendingEmailTo
      })
      if (!ok) return false
      await afterSuccessfulWrite(isCurrent)
      if (!isCurrent()) return true
      toast.add({ title: 'Message enregistré dans l’historique', type: 'success' })
      clearEmailReview()
      resetCompose()
      return true
    })
  }, [
    clearEmailReview,
    emailBody,
    emailSubject,
    afterSuccessfulWrite,
    onAddNote,
    pendingEmailTemplateId,
    pendingEmailTo,
    resetCompose,
    runSubmission
  ])

  const handleCreatePlan = () => {
    if (!tenant) return
    onCreatePlan(tenant)
  }

  const handleEditPlan = useCallback(
    (row: Activite) => {
      if (!tenant || !onEditPlan) return
      onEditPlan(tenant, row)
    },
    [onEditPlan, tenant]
  )
  const handleClose = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      onOpenChange(false)
    },
    [onOpenChange]
  )

  const scrollToTopRef = useScrollToTopOnOpen(
    open && tenant != null,
    tenant != null ? `${tenant.id_locataire}:${sheetOpenToken}` : null
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

  const handleCancelCompose = useCallback(() => {
    clearRcsReview()
    clearEmailReview()
    resetCompose()
  }, [clearEmailReview, clearRcsReview, resetCompose])

  const handleStartTodo = useCallback(() => {
    clearRcsReview()
    startTodo()
    scrollComposeIntoView()
  }, [clearRcsReview, scrollComposeIntoView, startTodo])

  const handleStartAction = useCallback(() => {
    clearRcsReview()
    startAction()
    scrollComposeIntoView()
  }, [clearRcsReview, scrollComposeIntoView, startAction])

  const handleSelectRcsTemplate = useCallback(
    (resolved: OutboundRcsResolved) => {
      startRcs()
      selectRcsTemplate(resolved)
      scrollComposeIntoView()
    },
    [scrollComposeIntoView, selectRcsTemplate, startRcs]
  )

  const handleSelectEmailTemplate = useCallback(
    (resolved: OutboundEmailResolved) => {
      startEmail()
      selectEmailTemplate(resolved)
      scrollComposeIntoView()
    },
    [scrollComposeIntoView, selectEmailTemplate, startEmail]
  )

  if (!tenant) {
    if (embedded) return null

    return (
      <>
        <Drawer
          open={false}
          onOpenChange={onOpenChange}
          onOpenChangeComplete={handleDrawerOpenChangeComplete}
          swipeDirection="right"
        >
          <DrawerContent className={INSPECTOR_DRAWER_CLASS} />
        </Drawer>
      </>
    )
  }

  const showDossierLoader = !contentReady || timelineInitialLoading
  const drawerTitle = `${tenant.id_client} · ${tenant.id_locataire}`

  const drawerHeader = (
    <DrawerHeader
      data-inspector-motion="header"
      className="flex-row items-center justify-between gap-2 border-b px-4 py-2 text-start"
    >
      <div className="min-w-0 flex-1">
        <DrawerTitle
          className="min-w-0 truncate font-sans text-sm leading-5 font-medium whitespace-nowrap tabular-nums"
          title={drawerTitle}
        >
          {drawerTitle}
        </DrawerTitle>
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

  const emailConfirmDialog = (
    <Dialog
      open={emailConfirmOpen}
      onOpenChange={(next) => {
        if (!next && submitting !== 'email') clearPendingMailto()
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Avez-vous envoyé cet e-mail&nbsp;?</DialogTitle>
          <DialogDescription>
            {pendingMailto?.subject
              ? `Objet : ${pendingMailto.subject}`
              : 'Confirmez l’envoi pour l’enregistrer dans l’historique du dossier.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={submitting === 'email'}
            onClick={clearPendingMailto}
          >
            Non
          </Button>
          <Button type="button" disabled={submitting === 'email'} onClick={handleConfirmEmailSent}>
            Oui, enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  const drawerBody = (
    <InspectorSplit
      leftRef={scrollRef}
      rightRef={historyScrollRef}
      left={
        <>
          <TenantSnapshotCard
            tenant={tenant}
            debtTrend={loadingMovements || movementsError ? 'flat' : debtEpisodeTrend(episode)}
            bucket={advancement.bucket}
            lastAction={advancement.action}
            tags={currentTags}
            gestionnaire={currentGestionnaire}
            columnValues={columnValues}
            className="mb-3"
          />
          <RepaymentOpenActionsCard
            actions={openActions}
            saving={submitting === 'action'}
            userLogin={userLogin}
            url={url}
            onComplete={(id) => patchAction(id, 'complete_action', '')}
            onIgnore={(id, motif) => patchAction(id, 'ignore_action', motif)}
            onEdit={handleEditAction}
            onDelete={handleRequestDeleteNote}
            className="mb-3"
          />
          {showDossierLoader ? (
            <InspectorTimelineSkeleton variant="repayment" pane="present" />
          ) : (
            <RepaymentComposeBlock
              tenant={tenant}
              userLogin={userLogin}
              todayIso={nowIso}
              composeMode={composeMode}
              composeEpoch={composeEpoch}
              currentGestionnaire={currentGestionnaire}
              columnValues={columnValues}
              draftBucket={draftBucket}
              onDraftBucketChange={setDraftBucket}
              draftTags={draftTags}
              onDraftTagsChange={setDraftTags}
              draftComment={draftComment}
              onDraftCommentChange={setDraftComment}
              advancementCanSave={canSaveAdvancement}
              tagsCanSave={canSaveTags}
              currentTags={currentTags}
              onStartNote={handleStartNote}
              onStartTodo={handleStartTodo}
              onStartAction={handleStartAction}
              onStartAdvancement={startAdvancement}
              onStartTags={handleStartTags}
              onStartAssignGestionnaire={
                gestionnaireAssignable && onAssignGestionnaire ? startAssignment : undefined
              }
              onSelectRcsTemplate={handleSelectRcsTemplate}
              onSelectEmailTemplate={handleSelectEmailTemplate}
              onSelectMailtoTemplate={selectMailtoTemplate}
              onCreatePlan={handleCreatePlan}
              activePlan={activePlan}
              onEditPlan={onEditPlan ? handleEditPlan : undefined}
              onCancelCompose={handleCancelCompose}
              onSubmitNote={handleSubmitNote}
              onSubmitAdvancement={handleSubmitAdvancement}
              onSubmitTags={handleSubmitTags}
              onSubmitAction={handleSubmitActionCompose}
              onImportEml={handleImportEml}
              onAssignGestionnaire={
                onAssignGestionnaire ? handleAssignGestionnaireSubmit : undefined
              }
              gestionnaireAssignable={gestionnaireAssignable}
              url={url}
              assigningGestionnaire={assigningGestionnaire}
              submitting={
                submitting === 'note' ||
                submitting === 'advancement' ||
                submitting === 'action' ||
                submitting === 'rcs' ||
                submitting === 'email' ||
                submitting === 'eml' ||
                submitting === 'tags'
              }
              rcsMessage={rcsMessage}
              onRcsMessageChange={setRcsMessage}
              onSubmitRcs={handleSubmitRcs}
              emailSubject={emailSubject}
              onEmailSubjectChange={setEmailSubject}
              emailBody={emailBody}
              onEmailBodyChange={setEmailBody}
              onSubmitEmail={handleSubmitEmail}
            />
          )}
        </>
      }
      right={
        showDossierLoader ? (
          <InspectorTimelineSkeleton variant="repayment" pane="history" />
        ) : (
          <ContextTimeline>
            <RepaymentTenantTimeline
              items={visibleTimelineEntries}
              journal={notifications}
              columnValues={columnValues}
              highlightId={highlightActivityId}
              userLogin={userLogin}
              onEditPlan={onEditPlan ? handleEditPlan : undefined}
              savingAction={submitting === 'action'}
              onReopenAction={handleReopenAction}
              onStartReply={handleStartReply}
              onStartEditNote={handleStartEditNote}
              onDeleteNote={handleRequestDeleteNote}
              onBoost={handleBoost}
            />
          </ContextTimeline>
        )
      }
    />
  )

  const deleteNoteDialog = (
    <Dialog
      open={deleteTarget != null}
      onOpenChange={(next) => {
        if (!next && !deletingNote) cancelDelete()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer définitivement</DialogTitle>
          <DialogDescription>
            Cette action est irréversible. Tout le fil disparaîtra de l’historique.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={deletingNote}
            onClick={cancelDelete}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={deletingNote}
            onClick={() => void handleConfirmDeleteNote()}
          >
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  if (embedded) {
    return (
      <>
        {drawerHeader}
        {drawerBody}
        {emailConfirmDialog}
        {deleteNoteDialog}
      </>
    )
  }

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        onOpenChangeComplete={handleDrawerOpenChangeComplete}
        swipeDirection="right"
      >
        <DrawerContent className={INSPECTOR_DRAWER_CLASS}>
          {drawerHeader}
          {drawerBody}
        </DrawerContent>
      </Drawer>
      {emailConfirmDialog}
      {deleteNoteDialog}
    </>
  )
}
