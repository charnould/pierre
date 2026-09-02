import { Database } from 'bun:sqlite'

import { z } from 'zod'

import { datastorePaths } from './paths'

export const TICKET_ID_SKILLS = [
  'ticket.answer-ticket',
  'ticket.write-memo',
  'ticket.rewrite-ticket'
] as const

export const ANSWER_CHANNELS = ['email', 'letter'] as const

export type TicketIdSkill = (typeof TICKET_ID_SKILLS)[number]
export type AnswerChannel = (typeof ANSWER_CHANNELS)[number]

export type TicketDraft = {
  id_reclamation: string
  id_skill: string
  channel: string | null
  generated_output: string | null
  generated_reasoning: string | null
  generated_duration_ms: number | null
  generated_at: string
  generated_by: string
  automation_id: string | null
  edited_output: string | null
  edited_at: string | null
  edited_by: string | null
  feedback_rating: number | null
  feedback_comment: string | null
  feedback_at: string | null
  feedback_by: string | null
}

export type DraftSummaryByTicket = {
  id_skills: string[]
  answer_channel?: AnswerChannel | null
  automation_skills: string[]
  latest_at?: string
  generated_by?: string
  edited_by?: string
}

const DRAFT_COLUMNS = `
  id_reclamation, id_skill, channel, generated_output, generated_reasoning, generated_duration_ms,
  generated_at, generated_by, automation_id, edited_output, edited_at, edited_by,
  feedback_rating, feedback_comment, feedback_at, feedback_by
`.trim()

const null_if_empty = (value: string | undefined | null): string | null => {
  if (value == null) return null
  return value.trim() === '' ? null : value
}

const draft_latest_timestamp = (generated_at: string, edited_at: string | null): string => {
  if (!edited_at) return generated_at
  return edited_at > generated_at ? edited_at : generated_at
}

const draftBase = z.object({
  id_reclamation: z.string().trim().min(1),
  id_skill: z.enum(TICKET_ID_SKILLS)
})

export const UpsertTicketDraftGenerationInput = draftBase.extend({
  save_kind: z.literal('generation'),
  channel: z.enum(ANSWER_CHANNELS).optional(),
  generated_output: z.string().optional(),
  generated_reasoning: z.string().optional(),
  generated_duration_ms: z.number().int().nonnegative().optional(),
  generated_by: z.string().trim().min(1),
  automation_id: z.string().trim().min(1).nullable().optional()
})

export const UpsertTicketDraftEditInput = draftBase.extend({
  save_kind: z.literal('edit'),
  edited_output: z.string().optional(),
  edited_by: z.string().trim().min(1)
})

export const UpsertTicketDraftFeedbackInput = draftBase.extend({
  save_kind: z.literal('feedback'),
  feedback_rating: z.number().int().min(1).max(5).nullable().optional(),
  feedback_comment: z.string().nullable().optional(),
  feedback_by: z.string().trim().min(1)
})

export const UpsertTicketDraftInput = z.discriminatedUnion('save_kind', [
  UpsertTicketDraftGenerationInput,
  UpsertTicketDraftEditInput,
  UpsertTicketDraftFeedbackInput
])

export type UpsertTicketDraftInput = z.infer<typeof UpsertTicketDraftInput>

export class TicketDraftsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TicketDraftsError'
  }
}

export const upsert_ticket_draft = (input: UpsertTicketDraftInput): TicketDraft => {
  const parsed = UpsertTicketDraftInput.parse(input)
  const db = new Database(datastorePaths().database)

  try {
    if (parsed.save_kind === 'generation') {
      const generated_at = new Date().toISOString()
      const automation_id = parsed.automation_id ?? null
      db.run(
        `INSERT INTO reclamation_drafts (
           id_reclamation, id_skill, channel, generated_output, generated_reasoning, generated_duration_ms,
           generated_at, generated_by, automation_id, edited_output, edited_at, edited_by,
           feedback_rating, feedback_comment, feedback_at, feedback_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
         ON CONFLICT(id_reclamation, id_skill) DO UPDATE SET
           channel = excluded.channel,
           generated_output = excluded.generated_output,
           generated_reasoning = excluded.generated_reasoning,
           generated_duration_ms = excluded.generated_duration_ms,
           generated_at = excluded.generated_at,
           generated_by = excluded.generated_by,
           automation_id = excluded.automation_id,
           edited_output = NULL,
           edited_at = NULL,
           edited_by = NULL,
           feedback_rating = NULL,
           feedback_comment = NULL,
           feedback_at = NULL,
           feedback_by = NULL`,
        [
          parsed.id_reclamation,
          parsed.id_skill,
          parsed.channel ?? null,
          null_if_empty(parsed.generated_output),
          null_if_empty(parsed.generated_reasoning),
          parsed.generated_duration_ms ?? null,
          generated_at,
          parsed.generated_by,
          automation_id
        ]
      )
    } else if (parsed.save_kind === 'edit') {
      const existing = db
        .query<{ n: number }, [string, string]>(
          `SELECT COUNT(*) as n FROM reclamation_drafts
           WHERE id_reclamation = ? AND id_skill = ?`
        )
        .get(parsed.id_reclamation, parsed.id_skill)

      if (!existing?.n) {
        throw new TicketDraftsError('Draft not found')
      }

      const edited_at = new Date().toISOString()
      db.run(
        `UPDATE reclamation_drafts SET
           edited_output = ?,
           edited_at = ?,
           edited_by = ?
         WHERE id_reclamation = ? AND id_skill = ?`,
        [
          null_if_empty(parsed.edited_output),
          edited_at,
          parsed.edited_by,
          parsed.id_reclamation,
          parsed.id_skill
        ]
      )
    } else {
      const existing = db
        .query<{ n: number }, [string, string]>(
          `SELECT COUNT(*) as n FROM reclamation_drafts
           WHERE id_reclamation = ? AND id_skill = ?`
        )
        .get(parsed.id_reclamation, parsed.id_skill)

      if (!existing?.n) {
        throw new TicketDraftsError('Draft not found')
      }

      const has_rating = parsed.feedback_rating != null
      const has_comment = !!null_if_empty(parsed.feedback_comment ?? null)
      const clearing = !has_rating && !has_comment

      const feedback_at = clearing ? null : new Date().toISOString()
      const feedback_by = clearing ? null : parsed.feedback_by
      const feedback_rating = clearing ? null : (parsed.feedback_rating ?? null)
      const feedback_comment = clearing ? null : null_if_empty(parsed.feedback_comment ?? null)

      db.run(
        `UPDATE reclamation_drafts SET
           feedback_rating = ?,
           feedback_comment = ?,
           feedback_at = ?,
           feedback_by = ?
         WHERE id_reclamation = ? AND id_skill = ?`,
        [
          feedback_rating,
          feedback_comment,
          feedback_at,
          feedback_by,
          parsed.id_reclamation,
          parsed.id_skill
        ]
      )
    }

    return get_ticket_draft(parsed.id_reclamation, parsed.id_skill)!
  } finally {
    db.close()
  }
}

export const get_ticket_draft = (id_reclamation: string, id_skill: string): TicketDraft | null => {
  const db = new Database(datastorePaths().database, { readonly: true })

  try {
    const row = db
      .query<TicketDraft, [string, string]>(
        `SELECT ${DRAFT_COLUMNS} FROM reclamation_drafts
         WHERE id_reclamation = ? AND id_skill = ?`
      )
      .get(id_reclamation, id_skill)

    return row ?? null
  } finally {
    db.close()
  }
}

export const list_ticket_drafts = (id_reclamation: string): TicketDraft[] => {
  const db = new Database(datastorePaths().database, { readonly: true })

  try {
    return db
      .query<TicketDraft, [string]>(
        `SELECT ${DRAFT_COLUMNS} FROM reclamation_drafts
         WHERE id_reclamation = ?
         ORDER BY id_skill ASC`
      )
      .all(id_reclamation)
  } finally {
    db.close()
  }
}

export const draft_summaries_by_ticket = (
  ticket_ids: string[]
): Map<string, DraftSummaryByTicket> => {
  const result = new Map<string, DraftSummaryByTicket>()
  if (ticket_ids.length === 0) return result

  const db = new Database(datastorePaths().database, { readonly: true })

  try {
    const placeholders = ticket_ids.map(() => '?').join(', ')
    const rows = db
      .query<
        {
          id_reclamation: string
          id_skill: string
          channel: string | null
          automation_id: string | null
          generated_at: string
          generated_by: string
          edited_at: string | null
          edited_by: string | null
        },
        string[]
      >(
        `SELECT id_reclamation, id_skill, channel, automation_id, generated_at, generated_by, edited_at, edited_by
         FROM reclamation_drafts
         WHERE id_reclamation IN (${placeholders})`
      )
      .all(...ticket_ids)

    for (const id of ticket_ids) {
      result.set(id, { id_skills: [], automation_skills: [] })
    }

    for (const row of rows) {
      const entry = result.get(row.id_reclamation)!
      entry.id_skills.push(row.id_skill)
      if (row.automation_id) {
        entry.automation_skills.push(row.id_skill)
      }
      if (row.id_skill === 'ticket.answer-ticket' && row.channel) {
        entry.answer_channel = row.channel as AnswerChannel
      }
      const row_latest = draft_latest_timestamp(row.generated_at, row.edited_at)
      if (!entry.latest_at || row_latest > entry.latest_at) {
        entry.latest_at = row_latest
        entry.generated_by = row.generated_by
        entry.edited_by = row.edited_at ? (row.edited_by ?? undefined) : undefined
      }
    }

    for (const entry of result.values()) {
      entry.id_skills.sort()
      entry.automation_skills.sort()
    }

    return result
  } finally {
    db.close()
  }
}
