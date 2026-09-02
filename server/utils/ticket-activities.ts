import { Database } from 'bun:sqlite'

import { z } from 'zod'

import type { Activite, ActivityType } from '../../shared/activites'
import { activity_timestamp, parse_contenu_json } from '../../shared/activites'
import { build_rattachement } from './activities/rows'
import { create_trusted_activity_with_db } from './activities/write'
import { datastorePaths } from './paths'

const TICKET_ID_SKILLS = [
  'ticket.answer-ticket',
  'ticket.write-memo',
  'ticket.summarize-ticket'
] as const
const ANSWER_CHANNELS = ['email', 'letter'] as const
type TicketIdSkill = (typeof TICKET_ID_SKILLS)[number]
type AnswerChannel = (typeof ANSWER_CHANNELS)[number]

export type TicketDraft = {
  activity_id: number
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
  markers: Array<{
    activity_id: number
    id_skill: string
    channel: string | null
    automation: boolean
  }>
  id_skills: string[]
  answer_channel?: AnswerChannel | null
  automation_skills: string[]
  latest_at?: string
  generated_by?: string
  edited_by?: string
}

const datastore_path = (): string => datastorePaths().database

const draftBase = z.object({
  id_reclamation: z.string().trim().min(1),
  id_skill: z.enum(TICKET_ID_SKILLS)
})

const UpsertTicketDraftGenerationInput = draftBase.extend({
  save_kind: z.literal('generation'),
  channel: z.enum(ANSWER_CHANNELS).optional(),
  generated_output: z.string().optional(),
  generated_reasoning: z.string().optional(),
  generated_duration_ms: z.number().int().nonnegative().optional(),
  generated_by: z.string().trim().min(1),
  automation_id: z.string().trim().min(1).nullable().optional(),
  tokens_entree: z.number().int().nonnegative().optional(),
  tokens_sortie: z.number().int().nonnegative().optional(),
  tokens_raisonnement: z.number().int().nonnegative().optional()
})

const UpsertTicketDraftEditInput = draftBase.extend({
  save_kind: z.literal('edit'),
  edited_output: z.string().optional(),
  edited_by: z.string().trim().min(1)
})

const UpsertTicketDraftFeedbackInput = draftBase.extend({
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

const activity_type = (skill: TicketIdSkill, _channel?: AnswerChannel): ActivityType => {
  if (skill === 'ticket.write-memo') return 'ticket_memo'
  if (skill === 'ticket.summarize-ticket') return 'ticket_summary'
  return 'ticket_reply'
}

type ActivityRow = Omit<Activite, 'mentions'> & {
  mentions: string
}

const list_rows = (db: Database, id_reclamation: string): ActivityRow[] =>
  db
    .query<ActivityRow, [string]>(
      `SELECT * FROM activites
       WHERE rattachement = ? AND statut = 'draft'
         AND type IN ('ticket_memo', 'ticket_summary', 'ticket_reply')
       ORDER BY date_creation DESC, id DESC`
    )
    .all(build_rattachement('tickets', id_reclamation))

const list_rows_for_tickets = (db: Database, ticket_ids: readonly string[]): ActivityRow[] => {
  const rows: ActivityRow[] = []
  for (let offset = 0; offset < ticket_ids.length; offset += 400) {
    const rattachements = ticket_ids
      .slice(offset, offset + 400)
      .map((id) => build_rattachement('tickets', id))
    if (rattachements.length === 0) continue
    rows.push(
      ...db
        .query<ActivityRow, string[]>(
          `SELECT * FROM activites
           WHERE rattachement IN (${rattachements.map(() => '?').join(', ')})
             AND statut = 'draft'
             AND type IN ('ticket_memo', 'ticket_summary', 'ticket_reply')
           ORDER BY date_creation DESC, id DESC`
        )
        .all(...rattachements)
    )
  }
  return rows
}

const string_or_null = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null

const number_or_null = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const skill_for_row = (
  row: Pick<ActivityRow, 'type'>,
  metadata: Record<string, unknown>
): TicketIdSkill => {
  const explicit = string_or_null(metadata['skill'])
  if (explicit && (TICKET_ID_SKILLS as readonly string[]).includes(explicit)) {
    return explicit as TicketIdSkill
  }
  if (row.type === 'ticket_memo') return 'ticket.write-memo'
  if (row.type === 'ticket_summary') return 'ticket.summarize-ticket'
  return 'ticket.answer-ticket'
}

const channel_from_metadata = (metadata: Record<string, unknown>): string | null => {
  const channel = string_or_null(metadata['canal']) ?? string_or_null(metadata['channel'])
  return channel === 'courrier' ? 'letter' : channel
}

const row_to_draft = (row: ActivityRow): TicketDraft => {
  const metadata = parse_contenu_json(row.contenu)
  const skill = skill_for_row(row, metadata)
  const channel = channel_from_metadata(metadata)
  const edition =
    metadata['edition'] && typeof metadata['edition'] === 'object'
      ? (metadata['edition'] as Record<string, unknown>)
      : {}
  const evaluation =
    metadata['evaluation'] && typeof metadata['evaluation'] === 'object'
      ? (metadata['evaluation'] as Record<string, unknown>)
      : {}
  return {
    activity_id: Number(row.id),
    id_reclamation: row.rattachement.slice(row.rattachement.indexOf(':') + 1),
    id_skill: skill,
    channel,
    generated_output:
      string_or_null(metadata['contenu_original']) ??
      string_or_null(metadata['corps']) ??
      string_or_null(metadata['contenu']),
    generated_reasoning: string_or_null(metadata['raisonnement']),
    generated_duration_ms: number_or_null(metadata['duree_ms']),
    generated_at: row.date_creation,
    generated_by: string_or_null(metadata['genere_par']) ?? row.auteur,
    automation_id: string_or_null(metadata['automation_id']),
    edited_output: edition['par'] == null ? null : string_or_null(metadata['contenu']),
    edited_at: string_or_null(edition['le']),
    edited_by: string_or_null(edition['par']),
    feedback_rating: number_or_null(evaluation['score']),
    feedback_comment: string_or_null(evaluation['commentaire']),
    feedback_at: string_or_null(evaluation['le']),
    feedback_by: string_or_null(evaluation['par'])
  }
}

const find_row = (db: Database, id_reclamation: string, id_skill: string): ActivityRow | null =>
  list_rows(db, id_reclamation).find(
    (row) => skill_for_row(row, parse_contenu_json(row.contenu)) === id_skill
  ) ?? null

export const upsert_ticket_draft = (input: UpsertTicketDraftInput): TicketDraft => {
  const parsed = UpsertTicketDraftInput.parse(input)
  const db = new Database(datastore_path())
  db.run('PRAGMA busy_timeout = 5000')
  try {
    const upsert = db.transaction(() => {
      if (parsed.save_kind === 'generation') {
        const type = activity_type(parsed.id_skill, parsed.channel)
        const existing = list_rows(db, parsed.id_reclamation).find((row) => row.type === type)
        const now = activity_timestamp()
        const author = parsed.automation_id
          ? `automation:${parsed.automation_id}`
          : `agent:${parsed.id_skill}`
        const metadata = {
          contenu: parsed.generated_output?.trim() ? parsed.generated_output : '',
          skill: parsed.id_skill,
          ...(parsed.channel ? { canal: parsed.channel } : {}),
          contenu_original: parsed.generated_output?.trim() ? parsed.generated_output : null,
          genere_par: parsed.generated_by,
          raisonnement: parsed.generated_reasoning ?? null,
          duree_ms: parsed.generated_duration_ms ?? null,
          ...(parsed.tokens_entree === undefined ? {} : { tokens_entree: parsed.tokens_entree }),
          ...(parsed.tokens_sortie === undefined ? {} : { tokens_sortie: parsed.tokens_sortie }),
          ...(parsed.tokens_raisonnement === undefined
            ? {}
            : { tokens_raisonnement: parsed.tokens_raisonnement }),
          ...(parsed.automation_id ? { automation_id: parsed.automation_id } : {})
        }
        const contenu = JSON.stringify(metadata)
        if (existing) {
          db.run(
            `UPDATE activites
           SET date_creation = ?, auteur = ?, contenu = ?
           WHERE id = ?`,
            [now, author, contenu, existing.id]
          )
          return row_to_draft({
            ...existing,
            date_creation: now,
            auteur: author,
            contenu
          })
        }
        const created = create_trusted_activity_with_db(db, parsed.generated_by, {
          contexte: 'tickets',
          ref: parsed.id_reclamation,
          type,
          statut: 'draft',
          contenu,
          auteur: author,
          date_creation: now
        })
        return row_to_draft({
          ...created,
          mentions: JSON.stringify(created.mentions),
          contenu: created.contenu
        })
      }

      const existing = find_row(db, parsed.id_reclamation, parsed.id_skill)
      if (!existing) throw new TicketDraftsError('Draft not found')
      const metadata = parse_contenu_json(existing.contenu)
      const now = activity_timestamp()
      if (parsed.save_kind === 'edit') {
        metadata['contenu'] = parsed.edited_output ?? ''
        metadata['edition'] = { par: parsed.edited_by, le: now }
      } else {
        const hasFeedback =
          parsed.feedback_rating != null ||
          Boolean(parsed.feedback_comment && parsed.feedback_comment.trim())
        metadata['evaluation'] = hasFeedback
          ? {
              score: parsed.feedback_rating ?? null,
              commentaire: parsed.feedback_comment?.trim() || null,
              le: now,
              par: parsed.feedback_by
            }
          : null
      }
      const contenu = JSON.stringify(metadata)
      db.run('UPDATE activites SET contenu = ? WHERE id = ?', [contenu, existing.id])
      return row_to_draft({ ...existing, contenu })
    })
    return upsert.immediate()
  } finally {
    db.close()
  }
}

export const get_ticket_draft = (id_reclamation: string, id_skill: string): TicketDraft | null => {
  const db = new Database(datastore_path(), { readonly: true })
  try {
    const row = find_row(db, id_reclamation, id_skill)
    return row ? row_to_draft(row) : null
  } finally {
    db.close()
  }
}

export const list_ticket_drafts = (id_reclamation: string): TicketDraft[] => {
  const db = new Database(datastore_path(), { readonly: true })
  try {
    return list_rows(db, id_reclamation).map(row_to_draft)
  } finally {
    db.close()
  }
}

export const draft_summaries_by_ticket = (
  ticket_ids: string[]
): Map<string, DraftSummaryByTicket> => {
  const result = new Map<string, DraftSummaryByTicket>()
  const grouped = new Map<string, TicketDraft[]>()
  if (ticket_ids.length > 0) {
    const db = new Database(datastore_path(), { readonly: true })
    try {
      for (const row of list_rows_for_tickets(db, ticket_ids)) {
        const draft = row_to_draft(row)
        const drafts = grouped.get(draft.id_reclamation) ?? []
        drafts.push(draft)
        grouped.set(draft.id_reclamation, drafts)
      }
    } finally {
      db.close()
    }
  }

  for (const id of ticket_ids) {
    const drafts = grouped.get(id) ?? []
    const markers = drafts.map((draft) => ({
      activity_id: draft.activity_id,
      id_skill: draft.id_skill,
      channel: draft.channel,
      automation: draft.automation_id != null
    }))
    const latest = [...drafts].sort((a, b) => {
      const date = (b.edited_at ?? b.generated_at).localeCompare(a.edited_at ?? a.generated_at)
      if (date !== 0) return date
      return Number(Boolean(b.edited_at)) - Number(Boolean(a.edited_at))
    })[0]
    result.set(id, {
      markers,
      id_skills: [...new Set(drafts.map((draft) => draft.id_skill))].sort(),
      answer_channel:
        (drafts.find((draft) => draft.id_skill === 'ticket.answer-ticket')?.channel as
          | AnswerChannel
          | null
          | undefined) ?? null,
      automation_skills: [
        ...new Set(drafts.filter((draft) => draft.automation_id).map((draft) => draft.id_skill))
      ].sort(),
      ...(latest
        ? {
            latest_at: latest.edited_at ?? latest.generated_at,
            generated_by: latest.generated_by,
            ...(latest.edited_by ? { edited_by: latest.edited_by } : {})
          }
        : {})
    })
  }
  return result
}
