import { Database } from 'bun:sqlite'

import { z } from 'zod'

import type { Activite } from '../../shared/activites'
import { activity_timestamp, parse_titled_content } from '../../shared/activites'
import { build_rattachement, insert_activity_row, resolve_activity_facets } from './activities/rows'
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

const SKILL_TITLE: Record<TicketIdSkill, string> = {
  'ticket.answer-ticket': 'Réponse',
  'ticket.write-memo': 'Mémo',
  'ticket.summarize-ticket': 'Synthèse'
}

const string_from = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null

const number_from = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const skill_of = (activity: Activite): TicketIdSkill | null => {
  const skill = string_from(parse_titled_content(activity.contenu)?.values?.['skill'])
  return skill && (TICKET_ID_SKILLS as readonly string[]).includes(skill)
    ? (skill as TicketIdSkill)
    : null
}

const list_rows = (db: Database, id_reclamation: string): Activite[] => {
  const rattachement = build_rattachement('tickets', id_reclamation)
  return db
    .query<Activite & { mentions: string }, [string]>(
      `SELECT * FROM activites
       WHERE rattachement = ? AND type LIKE 'artifact.%'
       ORDER BY date_creation DESC, id DESC`
    )
    .all(rattachement)
    .map((row) => ({
      ...row,
      mentions: JSON.parse(row.mentions) as Activite['mentions']
    }))
}

const latest_by_skill = (rows: Activite[]): Map<TicketIdSkill, Activite> => {
  const latest = new Map<TicketIdSkill, Activite>()
  const seen = new Set<TicketIdSkill>()
  for (const row of rows) {
    const skill = skill_of(row)
    if (!skill || seen.has(skill)) continue
    seen.add(skill)
    if (row.type === 'artifact.discarded' || row.type === 'artifact.finalized') continue
    latest.set(skill, row)
  }
  return latest
}

const row_to_draft = (row: Activite): TicketDraft => {
  const content = parse_titled_content(row.contenu)
  const values = content?.values ?? {}
  const editedBy = string_from(values['edited_by'])
  return {
    activity_id: Number(row.id),
    id_reclamation: row.rattachement.slice(row.rattachement.indexOf(':') + 1),
    id_skill: string_from(values['skill']) ?? '',
    channel: string_from(values['channel']),
    generated_output: editedBy ? string_from(values['generated_output']) : (content?.note ?? null),
    generated_reasoning: string_from(values['reasoning']),
    generated_duration_ms: number_from(values['duration_ms']),
    generated_at: string_from(values['generated_at']) ?? row.date_creation,
    generated_by: string_from(values['generated_by']) ?? row.auteur,
    automation_id: string_from(values['automation_id']),
    edited_output: editedBy ? (content?.note ?? null) : null,
    edited_at: string_from(values['edited_at']),
    edited_by: editedBy,
    feedback_rating: number_from(values['feedback_rating']),
    feedback_comment: string_from(values['feedback_comment']),
    feedback_at: string_from(values['feedback_at']),
    feedback_by: string_from(values['feedback_by'])
  }
}

const append_draft = (
  db: Database,
  input: {
    id_reclamation: string
    skill: TicketIdSkill
    type: 'artifact.generated' | 'artifact.regenerated' | 'artifact.feedback_recorded'
    auteur: string
    thread_id: string | null
    values: Record<string, string | number | boolean | null | undefined>
    note?: string
  }
): TicketDraft => {
  const now = activity_timestamp()
  const rattachement = build_rattachement('tickets', input.id_reclamation)
  const thread_id = input.thread_id ?? Bun.randomUUIDv7()
  const revision =
    (db
      .query<{ revision: number | null }, [string]>(
        'SELECT MAX(revision) AS revision FROM activites WHERE thread_id = ?'
      )
      .get(thread_id)?.revision ?? 0) + 1
  const created = insert_activity_row(db, {
    date_creation: now,
    rattachement,
    auteur: input.auteur,
    facets: resolve_activity_facets(db, 'tickets', input.id_reclamation),
    type: input.type,
    mentions: [],
    contenu: JSON.stringify({
      version: 2,
      title: SKILL_TITLE[input.skill],
      values: {
        skill: input.skill,
        ...Object.fromEntries(
          Object.entries(input.values).filter(([, value]) => value !== null && value !== undefined)
        )
      },
      ...(input.note != null ? { note: input.note } : {})
    }),
    thread_id,
    revision
  })
  return row_to_draft(created)
}

export const upsert_ticket_draft = (input: UpsertTicketDraftInput): TicketDraft => {
  const parsed = UpsertTicketDraftInput.parse(input)
  const db = new Database(datastore_path())
  db.run('PRAGMA busy_timeout = 5000')
  try {
    return db
      .transaction(() => {
        const existing = latest_by_skill(list_rows(db, parsed.id_reclamation)).get(parsed.id_skill)
        if (parsed.save_kind === 'generation') {
          const author = parsed.automation_id
            ? `automation:${parsed.automation_id}`
            : `agent:${parsed.id_skill}`
          return append_draft(db, {
            id_reclamation: parsed.id_reclamation,
            skill: parsed.id_skill,
            type: existing ? 'artifact.regenerated' : 'artifact.generated',
            auteur: author,
            thread_id: existing?.thread_id ?? null,
            values: {
              channel: parsed.channel ?? null,
              generated_by: parsed.generated_by,
              generated_at: activity_timestamp(),
              reasoning: parsed.generated_reasoning ?? null,
              duration_ms: parsed.generated_duration_ms ?? null,
              automation_id: parsed.automation_id ?? null,
              tokens_entree: parsed.tokens_entree ?? null,
              tokens_sortie: parsed.tokens_sortie ?? null,
              tokens_raisonnement: parsed.tokens_raisonnement ?? null
            },
            note: parsed.generated_output?.trim() ? parsed.generated_output : ''
          })
        }
        if (!existing) throw new TicketDraftsError('Draft not found')
        const current = row_to_draft(existing)
        if (parsed.save_kind === 'edit') {
          return append_draft(db, {
            id_reclamation: parsed.id_reclamation,
            skill: parsed.id_skill,
            type: 'artifact.regenerated',
            auteur: existing.auteur,
            thread_id: existing.thread_id ?? null,
            values: {
              skill: parsed.id_skill,
              channel: current.channel,
              generated_output: current.generated_output,
              generated_by: current.generated_by,
              generated_at: current.generated_at,
              reasoning: current.generated_reasoning,
              duration_ms: current.generated_duration_ms,
              automation_id: current.automation_id,
              edited_by: parsed.edited_by,
              edited_at: activity_timestamp()
            },
            note: parsed.edited_output ?? ''
          })
        }
        const hasFeedback =
          parsed.feedback_rating != null ||
          Boolean(parsed.feedback_comment && parsed.feedback_comment.trim())
        return append_draft(db, {
          id_reclamation: parsed.id_reclamation,
          skill: parsed.id_skill,
          type: 'artifact.feedback_recorded',
          auteur: existing.auteur,
          thread_id: existing.thread_id ?? null,
          values: {
            skill: parsed.id_skill,
            channel: current.channel,
            generated_output: current.generated_output,
            generated_by: current.generated_by,
            generated_at: current.generated_at,
            reasoning: current.generated_reasoning,
            duration_ms: current.generated_duration_ms,
            automation_id: current.automation_id,
            edited_by: current.edited_by,
            edited_at: current.edited_at,
            feedback_rating: hasFeedback ? (parsed.feedback_rating ?? null) : null,
            feedback_comment: hasFeedback ? (parsed.feedback_comment?.trim() ?? null) : null,
            feedback_at: hasFeedback ? activity_timestamp() : null,
            feedback_by: hasFeedback ? parsed.feedback_by : null
          },
          note: current.edited_output ?? current.generated_output ?? ''
        })
      })
      .immediate()
  } finally {
    db.close()
  }
}

export const get_ticket_draft = (id_reclamation: string, id_skill: string): TicketDraft | null => {
  const db = new Database(datastore_path(), { readonly: true })
  try {
    const row = latest_by_skill(list_rows(db, id_reclamation)).get(id_skill as TicketIdSkill)
    return row ? row_to_draft(row) : null
  } finally {
    db.close()
  }
}

export const list_ticket_drafts = (id_reclamation: string): TicketDraft[] => {
  const db = new Database(datastore_path(), { readonly: true })
  try {
    return [...latest_by_skill(list_rows(db, id_reclamation)).values()].map(row_to_draft)
  } finally {
    db.close()
  }
}

export const draft_summaries_by_ticket = (
  ticket_ids: string[]
): Map<string, DraftSummaryByTicket> => {
  const result = new Map<string, DraftSummaryByTicket>()
  const db = new Database(datastore_path(), { readonly: true })
  try {
    for (const id of ticket_ids) {
      const drafts = [...latest_by_skill(list_rows(db, id)).values()].map(row_to_draft)
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
  } finally {
    db.close()
  }
  return result
}
