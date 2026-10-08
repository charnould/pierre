import {
  Check,
  FolderKanban,
  ListTodo,
  type LucideIcon,
  MessageSquare,
  PiggyBank,
  Send,
  Tag,
  Upload,
  UserPlus
} from 'lucide-react'
import { type ReactNode, useRef } from 'react'

import { ActionPicker } from '@/shared/components/inspector/action-picker'
import { CaseBucketForm } from '@/shared/components/inspector/case-bucket-form'
import { CaseTagsForm } from '@/shared/components/inspector/case-tags-form'
import { InspectorComposeShell } from '@/shared/components/inspector/inspector-compose-shell'
import { InspectorRcsComposeFields } from '@/shared/components/inspector/inspector-rcs-compose-fields'
import { ReferentAssignmentForm } from '@/shared/components/inspector/referent-assignment-form'
import { useInspectorComposeFocus } from '@/shared/components/inspector/use-inspector-compose-focus'
import { TimelineActionRow } from '@/shared/components/timeline/timeline-action-row'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu'
import type { ActionDraft } from '@/shared/lib/activities/action-activity'
import type { ColumnValuesConfig } from '@/shared/lib/ui-settings/tickets-table'
import type { Activity } from '@/shared/types/activites'
import type { OrgUser } from '@/shared/types/users'

import type { RcsComposeValue } from '../../../../../shared/rcs-message'
import type { TenantRepaymentRow } from '../lib/classify-tenants'
import { repaymentDossierActionOptions } from '../lib/repayment-action'
import type { ActiveRepaymentPlan } from '../lib/repayment-activity-text'
import type { RepaymentGestionnaireAssignment } from '../lib/repayment-advancement'
import { type RepaymentBucketId, repaymentBucketOptions } from '../lib/repayment-bucket'
import type { ResolvedRepaymentEmail, ResolvedRepaymentRcs } from '../lib/repayment-messages'
import { repaymentTagOptions } from '../lib/repayment-tags'
import { RepaymentEmailReviewForm } from './RepaymentEmailReviewForm'
import { RepaymentInlineNoteForm } from './RepaymentInlineNoteForm'
import { RepaymentOutboundTemplateItems } from './RepaymentOutboundTemplateMenu'

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

function actionLabels() {
  return repaymentDossierActionOptions().map((option) => option.label)
}

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
  onSelectRcsTemplate: (resolved: ResolvedRepaymentRcs) => void
  onSelectEmailTemplate: (resolved: ResolvedRepaymentEmail) => void
  onSelectMailtoTemplate: (resolved: ResolvedRepaymentEmail) => void
  onCreatePlan: () => void
  onEditPlan?: (row: Activity) => void
  onCancelCompose: () => void
  onSubmitNote: (comment?: string) => void
  onSubmitAdvancement: () => void
  onSubmitTags: () => void
  onSubmitAction: (draft: ActionDraft) => void | Promise<boolean | void>
  onAssignGestionnaire?: (user: OrgUser) => void
  composeEpoch?: number
  rcsCompose: RcsComposeValue
  onRcsComposeChange: (value: RcsComposeValue) => void
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
  return { icon: FolderKanban, title: 'Changer la phase' }
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
        actionLabels={actionLabels()}
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
      <InspectorRcsComposeFields
        value={props.rcsCompose}
        onChange={props.onRcsComposeChange}
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
        options={repaymentTagOptions()}
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
      options={repaymentBucketOptions()}
      onBucketChange={(bucket) => props.onDraftBucketChange(bucket as RepaymentBucketId | null)}
      comment={props.draftComment}
      onCommentChange={props.onDraftCommentChange}
      columnValues={props.columnValues}
      onCancel={props.onCancelCompose}
      onSave={props.onSubmitAdvancement}
      canSave={props.advancementCanSave}
      saving={props.submitting}
      label="Phase"
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
                className="border-border/60 [&_svg]:text-muted-foreground w-full max-w-full justify-start gap-2 rounded-md px-3 text-start has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3"
              />
            }
          >
            <Icon data-icon="inline-start" className="size-4" aria-hidden />
            <span className="text-balance">{label}</span>
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
  const canEditTags = repaymentTagOptions().length > 0 && props.onStartTags != null
  const activePlan = props.activePlan ?? null
  const canOpenPlan = activePlan == null || props.onEditPlan != null
  const emlInputRef = useRef<HTMLInputElement>(null)
  const draftRef = useInspectorComposeFocus(composeMode != null)
  const meta = composeMode != null ? composeMeta(composeMode, hasReferent) : null

  return (
    <div className="relative overflow-hidden">
      {composeMode != null && meta ? (
        <div ref={draftRef} data-inspector-compose-presence="">
          <InspectorComposeShell
            icon={meta.icon}
            title={meta.title}
            pending={props.submitting || props.assigningGestionnaire}
          >
            <ComposeDraft composeMode={composeMode} props={props} />
          </InspectorComposeShell>
        </div>
      ) : (
        <ul
          data-inspector-compose-verbs=""
          className="m-0 inline-grid w-fit max-w-full list-none gap-1 p-0"
        >
          <TimelineActionRow
            icon={MessageSquare}
            label="Laisser une note"
            onClick={props.onStartNote}
          />
          <TimelineActionRow icon={ListTodo} label="Créer une tâche" onClick={props.onStartTodo} />
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
            label="Changer la phase"
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
        </ul>
      )}
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
