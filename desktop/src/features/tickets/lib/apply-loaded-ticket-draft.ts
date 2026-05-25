import { resolveDraftVariants } from '@/features/tickets/lib/draft-variant-parse'
import { formatFromDraft, type TicketSkillKey } from '@/features/tickets/lib/knowledge-skills'
import {
  defaultDraftRevision,
  draftVariantForRevision,
  type DraftRevision,
  type DraftVariants
} from '@/features/tickets/lib/ticket-draft-revision'
import type { TicketDraft } from '@/shared/types/ticket-draft'

export type DraftFeedbackState = {
  rating: number | null
  comment: string | null
  by: string | null
  at: string | null
}

export type ApplyLoadedTicketDraftInput = {
  draft: TicketDraft
  preferredRevision?: DraftRevision
}

export type ApplyLoadedTicketDraftResult = {
  variants: DraftVariants
  revision: DraftRevision
  content: { body: string; subject: string }
  format: TicketSkillKey | null
  answerChannel: string | null
  automationId: string | null
  feedback: DraftFeedbackState
}

export function applyLoadedTicketDraft({
  draft,
  preferredRevision
}: ApplyLoadedTicketDraftInput): ApplyLoadedTicketDraftResult {
  const variants = resolveDraftVariants(draft)
  const revision =
    preferredRevision === 'edited' && variants.edited
      ? 'edited'
      : preferredRevision === 'generated'
        ? 'generated'
        : defaultDraftRevision(variants)
  const content = draftVariantForRevision(variants, revision)
  const format = formatFromDraft(draft.id_skill, draft.channel)
  const answerChannel =
    draft.channel === 'email' || draft.channel === 'letter' ? draft.channel : null

  return {
    variants,
    revision,
    content,
    format,
    answerChannel,
    automationId: draft.automation_id,
    feedback: {
      rating: draft.feedback_rating,
      comment: draft.feedback_comment,
      by: draft.feedback_by,
      at: draft.feedback_at
    }
  }
}
