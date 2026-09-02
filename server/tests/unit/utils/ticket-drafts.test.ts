import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { create_activity } from '../../../utils/activities/write'
import { datastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'
import {
  draft_summaries_by_ticket,
  get_ticket_draft,
  list_ticket_drafts,
  TicketDraftsError,
  upsert_ticket_draft
} from '../../../utils/ticket-activities'

const TEST_SERVICE = '_test_ticket_drafts_svc'
const ORIGINAL_SERVICE = Bun.env['SERVICE']
const DATASTORE_ROOT = datastorePaths(TEST_SERVICE).root

beforeAll(async () => {
  Bun.env['SERVICE'] = TEST_SERVICE
})

afterAll(async () => {
  if (ORIGINAL_SERVICE === undefined) delete Bun.env['SERVICE']
  else Bun.env['SERVICE'] = ORIGINAL_SERVICE
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
})

beforeEach(async () => {
  await mkdir(DATASTORE_ROOT, { recursive: true })
  await setup()
})

afterEach(async () => {
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
})

describe('ticket_drafts', () => {
  it('generation upsert stores generated_* and null edited_*', () => {
    const draft = upsert_ticket_draft({
      save_kind: 'generation',
      id_reclamation: 'REQ-1',
      id_skill: 'ticket.answer-ticket',
      generated_output: 'sortie',
      generated_reasoning: 'think',
      generated_duration_ms: 1200,
      generated_by: 'alice@example.com'
    })
    expect(draft.generated_output).toBe('sortie')
    expect(draft.generated_reasoning).toBe('think')
    expect(draft.generated_duration_ms).toBe(1200)
    expect(draft.generated_by).toBe('alice@example.com')
    expect(draft.edited_output).toBeNull()
    expect(draft.edited_at).toBeNull()
    expect(draft.edited_by).toBeNull()
    expect(draft.channel).toBeNull()
    expect(draft.automation_id).toBeNull()
    expect(draft.feedback_rating).toBeNull()
  })

  it('generation upsert stores automation_id when provided', () => {
    const draft = upsert_ticket_draft({
      save_kind: 'generation',
      id_reclamation: 'REQ-AUTO',
      id_skill: 'ticket.answer-ticket',
      channel: 'email',
      generated_output: 'auto-o',
      generated_by: 'gensel@example.com',
      automation_id: 'auto-reply-nuit'
    })
    expect(draft.automation_id).toBe('auto-reply-nuit')
  })

  it('manual regeneration clears automation_id and feedback', () => {
    upsert_ticket_draft({
      save_kind: 'generation',
      id_reclamation: 'REQ-RG',
      id_skill: 'ticket.answer-ticket',
      generated_output: 'auto',
      generated_by: 'bot@x.com',
      automation_id: 'auto-1'
    })
    upsert_ticket_draft({
      save_kind: 'feedback',
      id_reclamation: 'REQ-RG',
      id_skill: 'ticket.answer-ticket',
      feedback_rating: 3,
      feedback_comment: 'ok',
      feedback_by: 'u@x.com'
    })
    const regen = upsert_ticket_draft({
      save_kind: 'generation',
      id_reclamation: 'REQ-RG',
      id_skill: 'ticket.answer-ticket',
      generated_output: 'manual',
      generated_by: 'human@x.com',
      automation_id: null
    })
    expect(regen.automation_id).toBeNull()
    expect(regen.feedback_rating).toBeNull()
    expect(regen.feedback_comment).toBeNull()
    expect(regen.feedback_by).toBeNull()
  })

  it('feedback upsert stores rating comment and metadata', () => {
    upsert_ticket_draft({
      save_kind: 'generation',
      id_reclamation: 'REQ-FB',
      id_skill: 'ticket.write-memo',
      generated_output: 'm',
      generated_by: 'g@x.com'
    })
    const rated = upsert_ticket_draft({
      save_kind: 'feedback',
      id_reclamation: 'REQ-FB',
      id_skill: 'ticket.write-memo',
      feedback_rating: 5,
      feedback_comment: 'Excellent',
      feedback_by: 'reviewer@x.com'
    })
    expect(rated.feedback_rating).toBe(5)
    expect(rated.feedback_comment).toBe('Excellent')
    expect(rated.feedback_by).toBe('reviewer@x.com')
    expect(rated.feedback_at).not.toBeNull()
  })

  it('feedback without draft throws', () => {
    expect(() =>
      upsert_ticket_draft({
        save_kind: 'feedback',
        id_reclamation: 'MISSING',
        id_skill: 'ticket.answer-ticket',
        feedback_rating: 2,
        feedback_by: 'u@x.com'
      })
    ).toThrow(TicketDraftsError)
  })

  it('clearing feedback sets all feedback fields to null', () => {
    upsert_ticket_draft({
      save_kind: 'generation',
      id_reclamation: 'REQ-CLR',
      id_skill: 'ticket.answer-ticket',
      generated_output: 'o',
      generated_by: 'g@x.com'
    })
    upsert_ticket_draft({
      save_kind: 'feedback',
      id_reclamation: 'REQ-CLR',
      id_skill: 'ticket.answer-ticket',
      feedback_rating: 2,
      feedback_comment: 'x',
      feedback_by: 'u@x.com'
    })
    const cleared = upsert_ticket_draft({
      save_kind: 'feedback',
      id_reclamation: 'REQ-CLR',
      id_skill: 'ticket.answer-ticket',
      feedback_rating: null,
      feedback_comment: null,
      feedback_by: 'u@x.com'
    })
    expect(cleared.feedback_rating).toBeNull()
    expect(cleared.feedback_comment).toBeNull()
    expect(cleared.feedback_at).toBeNull()
    expect(cleared.feedback_by).toBeNull()
  })

  it('generation upsert stores channel for answer-ticket', () => {
    const draft = upsert_ticket_draft({
      save_kind: 'generation',
      id_reclamation: 'REQ-CH',
      id_skill: 'ticket.answer-ticket',
      channel: 'letter',
      generated_output: 'sortie',
      generated_by: 'alice@example.com'
    })
    expect(draft.channel).toBe('letter')
    const loaded = get_ticket_draft('REQ-CH', 'ticket.answer-ticket')
    expect(loaded?.channel).toBe('letter')
  })

  it('normalizes empty strings to null', () => {
    const draft = upsert_ticket_draft({
      save_kind: 'generation',
      id_reclamation: 'REQ-1',
      id_skill: 'ticket.answer-ticket',
      generated_output: '  ',
      generated_by: 'a@x.com'
    })
    expect(draft.generated_output).toBeNull()
  })

  it('edit updates edited_* without touching generated_*', () => {
    upsert_ticket_draft({
      save_kind: 'generation',
      id_reclamation: 'REQ-1',
      id_skill: 'ticket.answer-ticket',
      generated_output: 'ia-o',
      generated_by: 'gen@x.com'
    })
    const edited = upsert_ticket_draft({
      save_kind: 'edit',
      id_reclamation: 'REQ-1',
      id_skill: 'ticket.answer-ticket',
      edited_output: 'user-o',
      edited_by: 'edit@x.com'
    })
    expect(edited.generated_output).toBe('ia-o')
    expect(edited.generated_by).toBe('gen@x.com')
    expect(edited.edited_output).toBe('user-o')
    expect(edited.edited_by).toBe('edit@x.com')
    expect(edited.edited_at).not.toBeNull()
  })

  it('regeneration resets edited_* and replaces generated_*', () => {
    upsert_ticket_draft({
      save_kind: 'generation',
      id_reclamation: 'REQ-1',
      id_skill: 'ticket.answer-ticket',
      generated_output: 'o1',
      generated_by: 'a@x.com'
    })
    upsert_ticket_draft({
      save_kind: 'edit',
      id_reclamation: 'REQ-1',
      id_skill: 'ticket.answer-ticket',
      edited_output: 'edit-o',
      edited_by: 'b@x.com'
    })
    const regen = upsert_ticket_draft({
      save_kind: 'generation',
      id_reclamation: 'REQ-1',
      id_skill: 'ticket.answer-ticket',
      generated_output: 'o2',
      generated_by: 'c@x.com'
    })
    expect(regen.generated_by).toBe('c@x.com')
    expect(regen.edited_by).toBeNull()
  })

  it('edit without draft throws', () => {
    expect(() =>
      upsert_ticket_draft({
        save_kind: 'edit',
        id_reclamation: 'MISSING',
        id_skill: 'ticket.answer-ticket',
        edited_output: 'y',
        edited_by: 'u@x.com'
      })
    ).toThrow(TicketDraftsError)
  })

  it('lists drafts and summarizes with generated_by and edited_by', () => {
    upsert_ticket_draft({
      save_kind: 'generation',
      id_reclamation: 'REQ-1',
      id_skill: 'ticket.answer-ticket',
      generated_output: 'e',
      generated_by: 'gen@x.com'
    })
    upsert_ticket_draft({
      save_kind: 'generation',
      id_reclamation: 'REQ-1',
      id_skill: 'ticket.write-memo',
      generated_by: 'gen@x.com'
    })
    upsert_ticket_draft({
      save_kind: 'edit',
      id_reclamation: 'REQ-1',
      id_skill: 'ticket.answer-ticket',
      edited_output: 'edited-o',
      edited_by: 'editor@x.com'
    })

    expect(list_ticket_drafts('REQ-1')).toHaveLength(2)

    const map = draft_summaries_by_ticket(['REQ-1', 'REQ-2'])
    expect(map.get('REQ-1')?.id_skills).toEqual(['ticket.answer-ticket', 'ticket.write-memo'])
    expect(map.get('REQ-1')?.generated_by).toBe('gen@x.com')
    expect(map.get('REQ-1')?.edited_by).toBe('editor@x.com')
    expect(map.get('REQ-2')?.id_skills).toEqual([])
  })

  it('draft_summaries includes answer_channel for answer-ticket', () => {
    upsert_ticket_draft({
      save_kind: 'generation',
      id_reclamation: 'REQ-CH2',
      id_skill: 'ticket.answer-ticket',
      channel: 'letter',
      generated_output: 'o',
      generated_by: 'a@x.com'
    })
    const map = draft_summaries_by_ticket(['REQ-CH2'])
    expect(map.get('REQ-CH2')?.answer_channel).toBe('letter')
  })

  it('draft_summaries includes automation_skills', () => {
    upsert_ticket_draft({
      save_kind: 'generation',
      id_reclamation: 'REQ-A1',
      id_skill: 'ticket.answer-ticket',
      channel: 'email',
      generated_output: 'o',
      generated_by: 'a@x.com',
      automation_id: 'auto-nuit'
    })
    upsert_ticket_draft({
      save_kind: 'generation',
      id_reclamation: 'REQ-A1',
      id_skill: 'ticket.write-memo',
      generated_output: 'm',
      generated_by: 'a@x.com'
    })
    const map = draft_summaries_by_ticket(['REQ-A1'])
    expect(map.get('REQ-A1')?.automation_skills).toEqual(['ticket.answer-ticket'])
  })

  it('draft_latest_at uses edited_at when newer than generated_at', async () => {
    upsert_ticket_draft({
      save_kind: 'generation',
      id_reclamation: 'REQ-T',
      id_skill: 'ticket.answer-ticket',
      generated_output: 'o',
      generated_by: 'g@x.com'
    })
    const gen = get_ticket_draft('REQ-T', 'ticket.answer-ticket')!
    await new Promise((resolve) => setTimeout(resolve, 5))
    upsert_ticket_draft({
      save_kind: 'edit',
      id_reclamation: 'REQ-T',
      id_skill: 'ticket.answer-ticket',
      edited_output: 'e',
      edited_by: 'e@x.com'
    })
    const edited = get_ticket_draft('REQ-T', 'ticket.answer-ticket')!
    expect(edited.edited_at).toBeTruthy()
    expect(edited.generated_at).toBe(gen.generated_at)

    const map = draft_summaries_by_ticket(['REQ-T'])
    expect(map.get('REQ-T')?.latest_at).toBe(edited.edited_at!)
    expect(map.get('REQ-T')?.edited_by).toBe('e@x.com')
  })

  it('decodes the generic draft payloads written by the desktop', () => {
    create_activity('alice@example.com', {
      contexte: 'tickets',
      ref: 'REQ-DESKTOP',
      type: 'ticket_reply',
      statut: 'draft',
      contenu: JSON.stringify({ canal: 'courrier', corps: 'Lettre' })
    })
    create_activity('alice@example.com', {
      contexte: 'tickets',
      ref: 'REQ-DESKTOP',
      type: 'ticket_memo',
      statut: 'draft',
      contenu: JSON.stringify({ contenu: 'Mémo' })
    })
    create_activity('alice@example.com', {
      contexte: 'tickets',
      ref: 'REQ-DESKTOP',
      type: 'ticket_summary',
      statut: 'draft',
      contenu: JSON.stringify({ contenu: 'Résumé' })
    })

    expect(get_ticket_draft('REQ-DESKTOP', 'ticket.answer-ticket')).toMatchObject({
      channel: 'letter',
      generated_output: 'Lettre'
    })
    expect(get_ticket_draft('REQ-DESKTOP', 'ticket.write-memo')?.generated_output).toBe('Mémo')
    expect(get_ticket_draft('REQ-DESKTOP', 'ticket.summarize-ticket')?.generated_output).toBe(
      'Résumé'
    )
  })

  it('rejects invalid save_kind via zod', () => {
    expect(() =>
      upsert_ticket_draft({
        save_kind: 'invalid',
        id_reclamation: 'X',
        id_skill: 'ticket.answer-ticket',
        generated_by: 'a@x.com'
      } as never)
    ).toThrow()
  })
})
