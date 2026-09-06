import ticketConfig from '@customization/tickets/config'
import {
  Check,
  ClipboardList,
  FolderKanban,
  ListTodo,
  MessageSquare,
  Send,
  Tag,
  Upload,
  UserPlus,
  type LucideIcon
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useRef } from 'react'

import type { AgentWorkPart } from '@/shared/components/AgentWorkTrace'
import { ActionPicker } from '@/shared/components/inspector/action-picker'
import { CaseBucketBadge } from '@/shared/components/inspector/case-bucket-badge'
import { CaseBucketForm } from '@/shared/components/inspector/case-bucket-form'
import { CaseTagsForm } from '@/shared/components/inspector/case-tags-form'
import { CollaboratorChip } from '@/shared/components/inspector/collaborator-chip'
import { InspectorComposeShell } from '@/shared/components/inspector/inspector-compose-shell'
import {
  InspectorSnapshotCard,
  InspectorSnapshotFact
} from '@/shared/components/inspector/inspector-snapshot-card'
import { ReferentAssignmentForm } from '@/shared/components/inspector/referent-assignment-form'
import { useInspectorComposeFocus } from '@/shared/components/inspector/use-inspector-compose-focus'
import { TimelineActionRow } from '@/shared/components/timeline/timeline-action-row'
import { Badge } from '@/shared/components/ui/badge'
import { toLocalIsoDate } from '@/shared/components/ui/date-picker'
import type { ActionDraft } from '@/shared/lib/activities/action-activity'
import { getTicketCellText } from '@/shared/lib/ticket-row'
import { composePresenceProps } from '@/shared/lib/timeline/compose-motion'
import { cn } from '@/shared/lib/utils'
import type { TicketRow } from '@/shared/types'
import type { OrgUser } from '@/shared/types/users'

import {
  getTicketBucketMeta,
  TICKET_BUCKET_OPTIONS,
  type TicketBucketId
} from '../lib/ticket-bucket'
import { getTicketExternalApplication } from '../lib/ticket-external-application'
import { TICKET_TAG_OPTIONS } from '../lib/ticket-tags'
import type { TicketComposeMode } from '../lib/use-tickets-view-data'
import { TicketCellValue } from './TicketCellValue'
import { TicketTenantReplyDraft, type TicketReplyFormat } from './TicketTenantReplyDraft'
import { TicketTimelineCommentDraft } from './TicketTimelineCommentDraft'
import { TicketTimelineSummarizeDraft } from './TicketTimelineSummarizeDraft'

type TicketAiComposeMode = Extract<
  TicketComposeMode,
  'rcs' | 'email' | 'letter' | 'external' | 'summarize'
>

const EXTERNAL_APPLICATION = getTicketExternalApplication(ticketConfig)

export type TicketAiGenerationProps = {
  target: TicketAiComposeMode
  isStreaming: boolean
  workParts: AgentWorkPart[]
  reasoningDuration?: number
  output: string
  showReasoning: boolean
}

interface Props {
  ticket: TicketRow
  composeMode: TicketComposeMode
  hasTimelineHistory: boolean
  aiBusy?: boolean
  submitting?: boolean
  aiGeneration?: TicketAiGenerationProps | null
  comment: string
  onCommentChange: (value: string) => void
  rcsMessage: string
  onRcsMessageChange: (value: string) => void
  emailSubject: string
  onEmailSubjectChange: (value: string) => void
  emailBody: string
  onEmailBodyChange: (value: string) => void
  letterSubject: string
  onLetterSubjectChange: (value: string) => void
  letterBody: string
  onLetterBodyChange: (value: string) => void
  externalSubject: string
  onExternalSubjectChange: (value: string) => void
  externalBody: string
  onExternalBodyChange: (value: string) => void
  summarizeContent: string
  onSummarizeContentChange: (value: string) => void
  onStartComment: () => void
  onStartTodo: () => void
  onStartAction: () => void
  onStartBucket: () => void
  onStartTags: () => void
  onStartAssignment: () => void
  onStartReply: () => void
  onReplyFormatChange: (format: TicketReplyFormat) => void
  onStartSummarize: () => void
  onCancelCompose: () => void
  onSubmitComment: () => void
  onSubmitAction: (draft: ActionDraft) => void | Promise<boolean | void>
  draftBucket: TicketBucketId | null
  currentBucket: TicketBucketId
  onDraftBucketChange: (bucket: TicketBucketId | null) => void
  bucketComment: string
  onBucketCommentChange: (comment: string) => void
  onSubmitBucket: () => void
  draftTags: string[]
  currentTags: string[]
  onDraftTagsChange: (tags: string[]) => void
  tagComment: string
  onTagCommentChange: (comment: string) => void
  onSubmitTags: () => void
  onAssignReferent: (user: OrgUser) => void
  onImportEml: (file: File) => void
  url?: string
  onSummarizeDraft: () => void
  onSummarizeSave: () => void
  onRcsDraft: () => void
  onRcsSend: () => void
  onEmailDraft: () => void
  onEmailSend: () => void
  onLetterDraft: () => void
  onLetterExportWord: () => void
  onLetterSend: () => void
  onExternalDraft: () => void
  onExternalInject: () => void
}

function composeMeta(mode: Exclude<TicketComposeMode, null>): { icon: LucideIcon; title: string } {
  if (mode === 'comment') return { icon: MessageSquare, title: 'Ajouter une note' }
  if (mode === 'todo') return { icon: ListTodo, title: 'Créer une tâche' }
  if (mode === 'action') return { icon: Check, title: 'Consigner une action réalisée' }
  if (mode === 'bucket') return { icon: FolderKanban, title: 'Changer de panier' }
  if (mode === 'tags') return { icon: Tag, title: 'Changer les tags' }
  if (mode === 'assignment') return { icon: UserPlus, title: 'Affecter à un référent' }
  if (mode === 'rcs' || mode === 'email' || mode === 'letter' || mode === 'external') {
    return { icon: Send, title: 'Répondre au locataire' }
  }
  return { icon: ClipboardList, title: 'Générer un point de situation' }
}

export function TicketSummaryCard({
  ticket,
  tags = [],
  referent,
  bucket
}: {
  ticket: TicketRow
  tags?: string[]
  referent?: string | null
  bucket?: TicketBucketId
}) {
  const tenant =
    getTicketCellText(ticket, 'ids_locataires_concernes') ||
    getTicketCellText(ticket, 'id_locataire')
  const lot = getTicketCellText(ticket, 'id_lot')
  const site = getTicketCellText(ticket, 'id_site')
  const created = getTicketCellText(ticket, 'cree_le') || getTicketCellText(ticket, 'date_creation')
  const channel = getTicketCellText(ticket, 'canal_contact')
  const qualification =
    getTicketCellText(ticket, 'qualification_1') ||
    getTicketCellText(ticket, 'motif') ||
    getTicketCellText(ticket, 'type_affaire')
  const state =
    getTicketCellText(ticket, 'statut') ||
    getTicketCellText(ticket, 'etat') ||
    getTicketCellText(ticket, 'dernier_evenement_type')
  const claimState = getTicketCellText(ticket, 'etat_de_la_reclamation')
  const progress = getTicketCellText(ticket, 'avancement')
  const effectiveReferent = referent || getTicketCellText(ticket, 'affectation_1')

  return (
    <InspectorSnapshotCard className="mb-3">
      {tenant ? (
        <InspectorSnapshotFact label="Locataire">
          <span className="text-foreground break-words tabular-nums">{tenant}</span>
        </InspectorSnapshotFact>
      ) : null}
      {lot ? (
        <InspectorSnapshotFact label="Lot">
          <span className="text-foreground break-words tabular-nums">{lot}</span>
        </InspectorSnapshotFact>
      ) : null}
      {site ? (
        <InspectorSnapshotFact label="Site">
          <span className="text-foreground break-words tabular-nums">{site}</span>
        </InspectorSnapshotFact>
      ) : null}
      {created ? (
        <InspectorSnapshotFact label="Reçue le">
          <span className="text-foreground break-words tabular-nums">{created}</span>
        </InspectorSnapshotFact>
      ) : null}
      {channel ? (
        <InspectorSnapshotFact label="Canal">
          <span className="text-foreground break-words">{channel}</span>
        </InspectorSnapshotFact>
      ) : null}
      {qualification ? (
        <InspectorSnapshotFact label="Qualification">
          <span className="text-foreground break-words">{qualification}</span>
        </InspectorSnapshotFact>
      ) : null}
      {state ? (
        <InspectorSnapshotFact label="État">
          <span className="text-foreground break-words">{state}</span>
        </InspectorSnapshotFact>
      ) : null}
      {claimState ? (
        <InspectorSnapshotFact label="État">
          <TicketCellValue
            column="etat_de_la_reclamation"
            value={claimState}
            className="h-4 max-w-full px-1.5 py-0"
          />
        </InspectorSnapshotFact>
      ) : null}
      {progress ? (
        <InspectorSnapshotFact label="Avancement">
          <TicketCellValue
            column="avancement"
            value={progress}
            className="h-4 max-w-full px-1.5 py-0"
          />
        </InspectorSnapshotFact>
      ) : null}
      {bucket ? (
        <InspectorSnapshotFact label="Panier">
          <CaseBucketBadge bucket={getTicketBucketMeta(bucket)} />
        </InspectorSnapshotFact>
      ) : null}
      {effectiveReferent ? (
        <InspectorSnapshotFact label="Référent">
          <CollaboratorChip identity={effectiveReferent} compact />
        </InspectorSnapshotFact>
      ) : null}
      {tags.length > 0 ? (
        <InspectorSnapshotFact label="Tags">
          {tags.map((tag) => (
            <Badge key={tag} variant="outline" className="h-4 max-w-full px-1.5 py-0">
              {tag}
            </Badge>
          ))}
        </InspectorSnapshotFact>
      ) : null}
    </InspectorSnapshotCard>
  )
}

function aiSurfaceFor(props: Props, mode: TicketAiComposeMode) {
  const gen = props.aiGeneration
  if (!gen || gen.target !== mode) {
    return {
      aiGenerating: false,
      showReasoning: false,
      workParts: [],
      reasoningDuration: undefined,
      streamOutput: '',
      isStreaming: false
    }
  }
  return {
    aiGenerating: true,
    showReasoning: gen.showReasoning,
    workParts: gen.workParts,
    reasoningDuration: gen.reasoningDuration,
    streamOutput: gen.output,
    isStreaming: gen.isStreaming
  }
}

function ComposeDraft({
  composeMode,
  props
}: {
  composeMode: Exclude<TicketComposeMode, null>
  props: Props
}) {
  if (composeMode === 'comment') {
    return (
      <TicketTimelineCommentDraft
        embedded
        comment={props.comment}
        onCommentChange={props.onCommentChange}
        onCancel={props.onCancelCompose}
        onSave={props.onSubmitComment}
        showConnector={props.hasTimelineHistory}
        saving={props.submitting}
      />
    )
  }
  if (composeMode === 'todo' || composeMode === 'action') {
    return (
      <ActionPicker
        intent={composeMode === 'todo' ? 'todo' : 'done'}
        actionLabels={[]}
        url={props.url}
        todayIso={toLocalIsoDate(new Date())}
        saving={props.submitting}
        onCancel={props.onCancelCompose}
        onSave={props.onSubmitAction}
      />
    )
  }
  if (composeMode === 'tags') {
    return (
      <CaseTagsForm
        tags={props.draftTags}
        options={TICKET_TAG_OPTIONS}
        onTagsChange={props.onDraftTagsChange}
        comment={props.tagComment}
        onCommentChange={props.onTagCommentChange}
        onCancel={props.onCancelCompose}
        onSave={props.onSubmitTags}
        canSave={
          props.draftTags.join('\0') !== props.currentTags.join('\0') ||
          props.tagComment.trim().length > 0
        }
        saving={props.submitting}
      />
    )
  }
  if (composeMode === 'bucket') {
    return (
      <CaseBucketForm
        bucket={props.draftBucket}
        options={TICKET_BUCKET_OPTIONS}
        onBucketChange={(bucket) => props.onDraftBucketChange(bucket as TicketBucketId | null)}
        comment={props.bucketComment}
        onCommentChange={props.onBucketCommentChange}
        onCancel={props.onCancelCompose}
        onSave={props.onSubmitBucket}
        canSave={
          (props.draftBucket != null && props.draftBucket !== props.currentBucket) ||
          props.bucketComment.trim().length > 0
        }
        saving={props.submitting}
      />
    )
  }
  if (composeMode === 'assignment') {
    return (
      <ReferentAssignmentForm
        url={props.url}
        comment={props.tagComment}
        onCommentChange={props.onTagCommentChange}
        onCancel={props.onCancelCompose}
        onSave={props.onAssignReferent}
        saving={props.submitting}
      />
    )
  }
  if (
    composeMode === 'rcs' ||
    composeMode === 'email' ||
    composeMode === 'letter' ||
    composeMode === 'external'
  ) {
    const ai = aiSurfaceFor(props, composeMode)
    const subject =
      composeMode === 'email'
        ? props.emailSubject
        : composeMode === 'letter'
          ? props.letterSubject
          : props.externalSubject
    const message =
      composeMode === 'rcs'
        ? props.rcsMessage
        : composeMode === 'email'
          ? props.emailBody
          : composeMode === 'letter'
            ? props.letterBody
            : props.externalBody
    return (
      <TicketTenantReplyDraft
        format={composeMode}
        onFormatChange={props.onReplyFormatChange}
        externalApplication={EXTERNAL_APPLICATION}
        subject={subject}
        onSubjectChange={
          composeMode === 'email'
            ? props.onEmailSubjectChange
            : composeMode === 'letter'
              ? props.onLetterSubjectChange
              : props.onExternalSubjectChange
        }
        message={message}
        onMessageChange={
          composeMode === 'rcs'
            ? props.onRcsMessageChange
            : composeMode === 'email'
              ? props.onEmailBodyChange
              : composeMode === 'letter'
                ? props.onLetterBodyChange
                : props.onExternalBodyChange
        }
        aiBusy={props.aiBusy}
        {...ai}
        onGenerate={
          composeMode === 'rcs'
            ? props.onRcsDraft
            : composeMode === 'email'
              ? props.onEmailDraft
              : composeMode === 'letter'
                ? props.onLetterDraft
                : props.onExternalDraft
        }
        onInject={props.onExternalInject}
        onSend={
          composeMode === 'rcs'
            ? props.onRcsSend
            : composeMode === 'email'
              ? props.onEmailSend
              : composeMode === 'letter'
                ? props.onLetterSend
                : undefined
        }
        onExportDocx={composeMode === 'letter' ? props.onLetterExportWord : undefined}
        onCancel={props.onCancelCompose}
        saving={props.submitting}
      />
    )
  }
  if (composeMode === 'summarize') {
    const ai = aiSurfaceFor(props, 'summarize')
    return (
      <TicketTimelineSummarizeDraft
        embedded
        content={props.summarizeContent}
        onContentChange={props.onSummarizeContentChange}
        aiBusy={props.aiBusy}
        {...ai}
        onDraft={props.onSummarizeDraft}
        onSave={props.onSummarizeSave}
        onCancel={props.onCancelCompose}
        showConnector={props.hasTimelineHistory}
        saving={props.submitting}
      />
    )
  }
  return null
}

export function TicketComposeBlock(props: Props) {
  const { composeMode } = props
  const emlInputRef = useRef<HTMLInputElement>(null)
  const reduceMotion = useReducedMotion()
  const draftRef = useInspectorComposeFocus(composeMode != null)
  const zoneMotion = composePresenceProps(reduceMotion)
  const insertMotion = composePresenceProps(reduceMotion, true)
  const meta = composeMode != null ? composeMeta(composeMode) : null
  const isTenantReply =
    composeMode === 'rcs' ||
    composeMode === 'email' ||
    composeMode === 'letter' ||
    composeMode === 'external'
  const composeKey = isTenantReply ? 'tenant-reply' : composeMode

  return (
    <div
      className={cn('relative overflow-hidden', isTenantReply && 'flex min-h-0 flex-1 flex-col')}
    >
      <AnimatePresence mode="wait" initial={false}>
        {composeMode != null && meta ? (
          <motion.div
            key={composeKey}
            ref={draftRef}
            className={cn(isTenantReply && 'min-h-0 flex-1')}
            {...insertMotion}
          >
            <InspectorComposeShell
              icon={meta.icon}
              title={meta.title}
              pending={props.submitting || props.aiBusy}
              className={cn(isTenantReply && 'flex h-full min-h-0 flex-col')}
              contentClassName={cn(isTenantReply && 'min-h-0 flex-1')}
            >
              <ComposeDraft composeMode={composeMode} props={props} />
            </InspectorComposeShell>
          </motion.div>
        ) : (
          <motion.ul
            key="actions"
            className="m-0 inline-grid w-fit max-w-full list-none gap-1 p-0"
            {...zoneMotion}
          >
            <TimelineActionRow
              icon={Send}
              label="Répondre au locataire"
              onClick={props.onStartReply}
            />
            <TimelineActionRow
              icon={ClipboardList}
              label="Générer un point de situation"
              onClick={props.onStartSummarize}
            />
            <TimelineActionRow
              icon={MessageSquare}
              label="Ajouter une note"
              onClick={props.onStartComment}
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
            <TimelineActionRow
              icon={FolderKanban}
              label="Changer de panier"
              onClick={props.onStartBucket}
            />
            <TimelineActionRow
              icon={Upload}
              label="Importer un email"
              onClick={() => emlInputRef.current?.click()}
            />
            <TimelineActionRow icon={Tag} label="Changer les tags" onClick={props.onStartTags} />
            <TimelineActionRow
              icon={UserPlus}
              label="Affecter à un référent"
              onClick={props.onStartAssignment}
            />
          </motion.ul>
        )}
      </AnimatePresence>
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
          if (file) props.onImportEml(file)
        }}
      />
    </div>
  )
}
