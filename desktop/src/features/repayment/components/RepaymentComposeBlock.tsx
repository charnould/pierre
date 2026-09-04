import {
  Check,
  FolderKanban,
  ListTodo,
  MessageSquare,
  PiggyBank,
  Send,
  Tag,
  Upload,
  UserPlus,
  type LucideIcon
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { type ReactNode, useRef } from 'react'

import { ActionPicker } from '@/shared/components/inspector/action-picker'
import { CaseBucketForm } from '@/shared/components/inspector/case-bucket-form'
import { CaseTagsForm } from '@/shared/components/inspector/case-tags-form'
import { InspectorComposeShell } from '@/shared/components/inspector/inspector-compose-shell'
import { ReferentAssignmentForm } from '@/shared/components/inspector/referent-assignment-form'
import { useInspectorComposeFocus } from '@/shared/components/inspector/use-inspector-compose-focus'
import {
  TIMELINE_ACTION_BUTTON_CLASS,
  TimelineActionRow
} from '@/shared/components/timeline/timeline-action-row'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu'
import type { ActionDraft } from '@/shared/lib/activities/action-activity'
import { composePresenceProps } from '@/shared/lib/timeline/compose-motion'
import type { ColumnValuesConfig } from '@/shared/lib/ui-settings/tickets-table'
import type { Activite } from '@/shared/types/activites'
import type { OrgUser } from '@/shared/types/users'

import type { TenantRepaymentRow } from '../lib/classify-tenants'
import type { OutboundEmailResolved, OutboundRcsResolved } from '../lib/outbound-email-templates'
import { REPAYMENT_DOSSIER_ACTION_OPTIONS } from '../lib/repayment-action'
import type { ActiveRepaymentPlan } from '../lib/repayment-activity-text'
import type { RepaymentGestionnaireAssignment } from '../lib/repayment-advancement'
import { REPAYMENT_BUCKET_OPTIONS, type RepaymentBucketId } from '../lib/repayment-bucket'
import { REPAYMENT_TAG_OPTIONS } from '../lib/repayment-tags'
import { RepaymentEmailReviewForm } from './RepaymentEmailReviewForm'
import { RepaymentInlineNoteForm } from './RepaymentInlineNoteForm'
import { RepaymentOutboundTemplateItems } from './RepaymentOutboundTemplateMenu'
import { RepaymentRcsReviewForm } from './RepaymentRcsReviewForm'

export type RepaymentComposeMode =
  | 'note'
  | 'edit_note'
  | 'advancement'
  | 'assign_gestionnaire'
  | 'todo'
  | 'action'
  | 'rcs'
  | 'email'
  | 'tags'
  | null

const ACTION_LABELS = REPAYMENT_DOSSIER_ACTION_OPTIONS.map((option) => option.label)

interface Props {
  tenant: TenantRepaymentRow
  userLogin: string
  todayIso: string
  composeMode: RepaymentComposeMode
  currentGestionnaire: RepaymentGestionnaireAssignment
  columnValues?: ColumnValuesConfig
  draftBucket: RepaymentBucketId | null
  onDraftBucketChange: (bucket: RepaymentBucketId | null) => void
  draftTags: string[]
  onDraftTagsChange: (tags: string[]) => void
  draftComment: string
  onDraftCommentChange: (comment: string) => void
  advancementCanSave: boolean
  tagsCanSave: boolean
  currentTags?: readonly string[]
  gestionnaireAssignable?: boolean
  url?: string
  assigningGestionnaire?: boolean
  submitting?: boolean
  activePlan?: ActiveRepaymentPlan | null
  onStartNote: () => void
  onStartTodo: () => void
  onStartAction: () => void
  onStartAdvancement: () => void
  onStartTags?: () => void
  onStartAssignGestionnaire?: () => void
  onSelectRcsTemplate: (resolved: OutboundRcsResolved) => void
  onSelectEmailTemplate: (resolved: OutboundEmailResolved) => void
  onSelectMailtoTemplate: (resolved: OutboundEmailResolved) => void
  onCreatePlan: () => void
  onEditPlan?: (row: Activite) => void
  onCancelCompose: () => void
  onSubmitNote: (comment?: string) => void
  onSubmitAdvancement: () => void
  onSubmitTags: () => void
  onSubmitAction: (draft: ActionDraft) => void | Promise<boolean | void>
  onAssignGestionnaire?: (user: OrgUser) => void
  composeEpoch?: number
  rcsMessage: string
  onRcsMessageChange: (message: string) => void
  onSubmitRcs: () => void
  emailSubject: string
  onEmailSubjectChange: (subject: string) => void
  emailBody: string
  onEmailBodyChange: (body: string) => void
  onSubmitEmail: () => void
  onImportEml?: (file: File) => void
}

function planVerbLabel(plan: ActiveRepaymentPlan | null | undefined): string {
  if (plan == null) return 'Créer un plan d’apurement'
  if (plan.signed) return 'Clôturer le plan d’apurement'
  return 'Modifier le plan d’apurement'
}

function composeMeta(
  mode: Exclude<RepaymentComposeMode, null>,
  hasReferent: boolean
): { icon: LucideIcon; title: string } {
  if (mode === 'note') return { icon: MessageSquare, title: 'Laisser une note' }
  if (mode === 'edit_note') return { icon: MessageSquare, title: 'Modifier la note' }
  if (mode === 'todo') return { icon: ListTodo, title: 'Créer une tâche' }
  if (mode === 'action') return { icon: Check, title: 'Consigner une action réalisée' }
  if (mode === 'rcs' || mode === 'email') return { icon: Send, title: 'Contacter un tiers' }
  if (mode === 'tags') return { icon: Tag, title: 'Changer les tags' }
  if (mode === 'assign_gestionnaire') {
    return {
      icon: UserPlus,
      title: hasReferent ? 'Réaffecter à un référent' : 'Affecter à un référent'
    }
  }
  return { icon: FolderKanban, title: 'Changer le groupe' }
}

function ComposeDraft({
  composeMode,
  props
}: {
  composeMode: Exclude<RepaymentComposeMode, null>
  props: Props
}) {
  if (composeMode === 'note' || composeMode === 'edit_note') {
    const editing = composeMode === 'edit_note'
    return (
      <RepaymentInlineNoteForm
        value={props.draftComment}
        onChange={props.onDraftCommentChange}
        onCancel={props.onCancelCompose}
        onSave={props.onSubmitNote}
        saveLabel={editing ? 'Enregistrer' : 'Ajouter'}
        placeholder={editing ? 'Modifier la note… Tapez @ pour mentionner un collègue' : undefined}
        saving={props.submitting}
      />
    )
  }

  if (composeMode === 'assign_gestionnaire') {
    return (
      <ReferentAssignmentForm
        url={props.url}
        comment={props.draftComment}
        onCommentChange={props.onDraftCommentChange}
        onCancel={props.onCancelCompose}
        onSave={(user) => props.onAssignGestionnaire?.(user)}
        saving={props.assigningGestionnaire}
      />
    )
  }

  if (composeMode === 'todo' || composeMode === 'action') {
    return (
      <ActionPicker
        key={props.composeEpoch}
        intent={composeMode === 'todo' ? 'todo' : 'done'}
        actionLabels={ACTION_LABELS}
        url={props.url}
        defaultAssignee={props.userLogin}
        todayIso={props.todayIso}
        saving={props.submitting}
        onCancel={props.onCancelCompose}
        onSave={props.onSubmitAction}
      />
    )
  }

  if (composeMode === 'rcs') {
    return (
      <RepaymentRcsReviewForm
        message={props.rcsMessage}
        onMessageChange={props.onRcsMessageChange}
        onCancel={props.onCancelCompose}
        onSend={props.onSubmitRcs}
        sending={props.submitting}
      />
    )
  }

  if (composeMode === 'email') {
    return (
      <RepaymentEmailReviewForm
        subject={props.emailSubject}
        onSubjectChange={props.onEmailSubjectChange}
        message={props.emailBody}
        onMessageChange={props.onEmailBodyChange}
        onCancel={props.onCancelCompose}
        onSend={props.onSubmitEmail}
        sending={props.submitting}
      />
    )
  }

  if (composeMode === 'tags') {
    return (
      <CaseTagsForm
        tags={props.draftTags}
        options={REPAYMENT_TAG_OPTIONS}
        onTagsChange={props.onDraftTagsChange}
        comment={props.draftComment}
        onCommentChange={props.onDraftCommentChange}
        onCancel={props.onCancelCompose}
        onSave={props.onSubmitTags}
        canSave={props.tagsCanSave}
        saving={props.submitting}
      />
    )
  }

  return (
    <CaseBucketForm
      bucket={props.draftBucket}
      options={REPAYMENT_BUCKET_OPTIONS}
      onBucketChange={(bucket) => props.onDraftBucketChange(bucket as RepaymentBucketId | null)}
      comment={props.draftComment}
      onCommentChange={props.onDraftCommentChange}
      columnValues={props.columnValues}
      onCancel={props.onCancelCompose}
      onSave={props.onSubmitAdvancement}
      canSave={props.advancementCanSave}
      saving={props.submitting}
      label="Groupe"
    />
  )
}

function VerbMenu({
  icon: Icon,
  label,
  children
}: {
  icon: typeof Send
  label: string
  children: ReactNode
}) {
  return (
    <TimelineActionRow
      icon={Icon}
      label={label}
      trigger={
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="default"
                className={TIMELINE_ACTION_BUTTON_CLASS}
              />
            }
          >
            <Icon data-icon="inline-start" className="text-muted-foreground size-4" aria-hidden />
            <span className="[text-wrap:balance]">{label}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-w-80 min-w-64">
            {children}
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  )
}

export function RepaymentComposeBlock(props: Props) {
  const { composeMode } = props
  const hasReferent = Boolean(props.currentGestionnaire.email || props.currentGestionnaire.login)
  const canEditTags = REPAYMENT_TAG_OPTIONS.length > 0 && props.onStartTags != null
  const activePlan = props.activePlan ?? null
  const canOpenPlan = activePlan == null || props.onEditPlan != null
  const emlInputRef = useRef<HTMLInputElement>(null)
  const reduceMotion = useReducedMotion()
  const draftRef = useInspectorComposeFocus(composeMode != null)
  const zoneMotion = composePresenceProps(reduceMotion)
  const insertMotion = composePresenceProps(reduceMotion, true)
  const meta = composeMode != null ? composeMeta(composeMode, hasReferent) : null

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        {composeMode != null && meta ? (
          <motion.div key={composeMode} ref={draftRef} {...insertMotion}>
            <InspectorComposeShell
              icon={meta.icon}
              title={meta.title}
              pending={props.submitting || props.assigningGestionnaire}
            >
              <ComposeDraft composeMode={composeMode} props={props} />
            </InspectorComposeShell>
          </motion.div>
        ) : (
          <motion.ul
            key="verbs"
            data-inspector-compose-verbs=""
            className="m-0 inline-grid w-fit max-w-full list-none gap-1 p-0"
            {...zoneMotion}
          >
            <TimelineActionRow
              icon={MessageSquare}
              label="Laisser une note"
              onClick={props.onStartNote}
            />
            <TimelineActionRow
              icon={ListTodo}
              label="Créer une tâche"
              onClick={props.onStartTodo}
            />
            <TimelineActionRow
              icon={Check}
              label="Consigner une action réalisée"
              onClick={props.onStartAction}
            />
            <VerbMenu icon={Send} label="Contacter un tiers">
              <RepaymentOutboundTemplateItems
                tenant={props.tenant}
                onSelectRcs={props.onSelectRcsTemplate}
                onSelectEmail={props.onSelectEmailTemplate}
                onSelectMailto={props.onSelectMailtoTemplate}
              />
            </VerbMenu>
            {canOpenPlan ? (
              <TimelineActionRow
                icon={PiggyBank}
                label={planVerbLabel(activePlan)}
                onClick={() => {
                  if (activePlan == null) props.onCreatePlan()
                  else props.onEditPlan?.(activePlan.row)
                }}
              />
            ) : null}
            {props.onImportEml ? (
              <TimelineActionRow
                icon={Upload}
                label="Importer un email"
                onClick={() => emlInputRef.current?.click()}
              />
            ) : null}
            <TimelineActionRow
              icon={FolderKanban}
              label="Changer le groupe"
              onClick={props.onStartAdvancement}
            />
            {canEditTags ? (
              <TimelineActionRow
                icon={Tag}
                label="Changer les tags"
                onClick={() => props.onStartTags?.()}
              />
            ) : null}
            {props.gestionnaireAssignable && props.onStartAssignGestionnaire ? (
              <TimelineActionRow
                icon={UserPlus}
                label={hasReferent ? 'Réaffecter à un référent' : 'Affecter à un référent'}
                onClick={props.onStartAssignGestionnaire}
              />
            ) : null}
          </motion.ul>
        )}
      </AnimatePresence>
      {props.onImportEml ? (
        <input
          ref={emlInputRef}
          type="file"
          accept=".eml"
          className="sr-only"
          tabIndex={-1}
          aria-label="Fichier .eml"
          disabled={props.submitting}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) props.onImportEml?.(file)
          }}
        />
      ) : null}
    </div>
  )
}
