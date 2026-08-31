import {
  AtSign,
  ClipboardList,
  MessageSquare,
  Phone,
  ScrollText,
  type LucideIcon
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { InspectorComposeShell } from '@/shared/components/inspector/inspector-compose-shell'
import { useInspectorComposeFocus } from '@/shared/components/inspector/use-inspector-compose-focus'
import { TimelineActionRow } from '@/shared/components/timeline/timeline-action-row'
import { getTicketCellText } from '@/shared/lib/ticket-row'
import { composePresenceProps } from '@/shared/lib/timeline/compose-motion'
import type { TicketRow } from '@/shared/types'

import type { TicketComposeMode } from '../lib/use-tickets-view-data'
import { TicketTimelineCommentDraft } from './TicketTimelineCommentDraft'
import { TicketTimelineEmailDraft } from './TicketTimelineEmailDraft'
import { TicketTimelineLetterDraft } from './TicketTimelineLetterDraft'
import { TicketTimelineRcsDraft } from './TicketTimelineRcsDraft'
import { TicketTimelineSummarizeDraft } from './TicketTimelineSummarizeDraft'

export type TicketAiGenerationProps = {
  target: Exclude<TicketComposeMode, 'comment' | null>
  isStreaming: boolean
  isReasoningPhase: boolean
  reasoning: string
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
  summarizeContent: string
  onSummarizeContentChange: (value: string) => void
  onStartComment: () => void
  onStartRcs: () => void
  onStartEmail: () => void
  onStartLetter: () => void
  onStartSummarize: () => void
  onCancelCompose: () => void
  onSubmitComment: () => void
  onSummarizeDraft: () => void
  onSummarizeSave: () => void
  onRcsDraft: () => void
  onRcsSaveDraft: () => void
  onRcsSend: () => void
  onEmailDraft: () => void
  onEmailSaveDraft: () => void
  onEmailSend: () => void
  onLetterDraft: () => void
  onLetterSaveDraft: () => void
  onLetterExportWord: () => void
  onLetterMarkSent: () => void
}

function composeMeta(mode: Exclude<TicketComposeMode, null>): { icon: LucideIcon; title: string } {
  if (mode === 'comment') return { icon: MessageSquare, title: 'Ajouter une note' }
  if (mode === 'rcs') return { icon: Phone, title: 'Envoyer un RCS au locataire' }
  if (mode === 'email') return { icon: AtSign, title: 'Envoyer un courriel au locataire' }
  if (mode === 'letter')
    return { icon: ScrollText, title: 'Envoyer un courrier postal au locataire' }
  return { icon: ClipboardList, title: 'Générer un point de situation' }
}

export function TicketSummaryCard({ ticket }: { ticket: TicketRow }) {
  const id = getTicketCellText(ticket, 'id_reclamation')
  const tenant = getTicketCellText(ticket, 'id_locataire')
  const message = getTicketCellText(ticket, 'message')
  const excerpt = message.length > 120 ? `${message.slice(0, 120)}…` : message

  return (
    <div className="border-border bg-card mb-3 rounded-lg border px-3 py-2.5">
      <p
        className="min-w-0 text-[0.8125rem] leading-[1.125rem] font-medium break-words tabular-nums"
        title={id || undefined}
      >
        {id || 'Réclamation'}
      </p>
      {tenant ? (
        <p className="text-muted-foreground mt-0.5 text-xs">
          Locataire ·{' '}
          <span className="break-words tabular-nums" title={tenant}>
            {tenant}
          </span>
        </p>
      ) : null}
      {excerpt ? (
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed break-words">{excerpt}</p>
      ) : null}
    </div>
  )
}

function aiSurfaceFor(props: Props, mode: Exclude<TicketComposeMode, 'comment' | null>) {
  const gen = props.aiGeneration
  if (!gen || gen.target !== mode) {
    return {
      aiGenerating: false,
      showReasoning: false,
      reasoning: '',
      streamOutput: '',
      isStreaming: false,
      isReasoningPhase: false
    }
  }
  return {
    aiGenerating: true,
    showReasoning: gen.showReasoning,
    reasoning: gen.reasoning,
    streamOutput: gen.output,
    isStreaming: gen.isStreaming,
    isReasoningPhase: gen.isReasoningPhase
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
  if (composeMode === 'rcs') {
    const ai = aiSurfaceFor(props, 'rcs')
    return (
      <TicketTimelineRcsDraft
        embedded
        message={props.rcsMessage}
        onMessageChange={props.onRcsMessageChange}
        aiBusy={props.aiBusy}
        {...ai}
        onDraft={props.onRcsDraft}
        onSaveDraft={props.onRcsSaveDraft}
        onSend={props.onRcsSend}
        onCancel={props.onCancelCompose}
        showConnector={props.hasTimelineHistory}
        saving={props.submitting}
      />
    )
  }
  if (composeMode === 'email') {
    const ai = aiSurfaceFor(props, 'email')
    return (
      <TicketTimelineEmailDraft
        embedded
        subject={props.emailSubject}
        onSubjectChange={props.onEmailSubjectChange}
        body={props.emailBody}
        onBodyChange={props.onEmailBodyChange}
        aiBusy={props.aiBusy}
        {...ai}
        onDraft={props.onEmailDraft}
        onSaveDraft={props.onEmailSaveDraft}
        onSend={props.onEmailSend}
        onCancel={props.onCancelCompose}
        showConnector={props.hasTimelineHistory}
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
  const ai = aiSurfaceFor(props, 'letter')
  return (
    <TicketTimelineLetterDraft
      embedded
      subject={props.letterSubject}
      onSubjectChange={props.onLetterSubjectChange}
      body={props.letterBody}
      onBodyChange={props.onLetterBodyChange}
      aiBusy={props.aiBusy}
      {...ai}
      onDraft={props.onLetterDraft}
      onSaveDraft={props.onLetterSaveDraft}
      onExportWord={props.onLetterExportWord}
      onMarkSent={props.onLetterMarkSent}
      onCancel={props.onCancelCompose}
      showConnector={props.hasTimelineHistory}
      saving={props.submitting}
    />
  )
}

export function TicketComposeBlock(props: Props) {
  const { composeMode } = props
  const reduceMotion = useReducedMotion()
  const draftRef = useInspectorComposeFocus(composeMode != null)
  const zoneMotion = composePresenceProps(reduceMotion)
  const insertMotion = composePresenceProps(reduceMotion, true)
  const meta = composeMode != null ? composeMeta(composeMode) : null

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        {composeMode != null && meta ? (
          <motion.div key={composeMode} ref={draftRef} {...insertMotion}>
            <InspectorComposeShell
              icon={meta.icon}
              title={meta.title}
              pending={props.submitting || props.aiBusy}
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
              icon={MessageSquare}
              label="Ajouter une note"
              onClick={props.onStartComment}
            />
            <TimelineActionRow
              icon={Phone}
              label="Envoyer un RCS au locataire"
              onClick={props.onStartRcs}
            />
            <TimelineActionRow
              icon={AtSign}
              label="Envoyer un courriel au locataire"
              onClick={props.onStartEmail}
            />
            <TimelineActionRow
              icon={ScrollText}
              label="Envoyer un courrier postal au locataire"
              onClick={props.onStartLetter}
            />
            <TimelineActionRow
              icon={ClipboardList}
              label="Générer un point de situation"
              onClick={props.onStartSummarize}
            />
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
