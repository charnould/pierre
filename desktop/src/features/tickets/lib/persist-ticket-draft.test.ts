import { afterEach, describe, expect, it, mock } from 'bun:test'

import { persistTicketDraft } from './persist-ticket-draft'

describe('persistTicketDraft', () => {
  const originalApi = globalThis.window?.api

  afterEach(() => {
    if (originalApi) {
      ;(globalThis as { window?: { api: typeof originalApi } }).window = {
        api: originalApi
      }
    }
  })

  it('returns false without url', async () => {
    expect(
      await persistTicketDraft(undefined, {
        save_kind: 'edit',
        id_reclamation: '1',
        id_skill: 'ticket.answer-ticket',
        edited_output: ''
      })
    ).toBe(false)
  })

  it('calls putTicketDraft when url is set (no enabled gate)', async () => {
    const putTicketDraft = mock(() =>
      Promise.resolve({
        ok: true as const,
        generated_at: 't',
        generated_by: 'u',
        automation_id: null,
        edited_at: null,
        edited_by: null,
        feedback_at: null,
        feedback_by: null
      })
    )

    ;(globalThis as { window: { api: { putTicketDraft: typeof putTicketDraft } } }).window = {
      api: { putTicketDraft } as unknown as Window['api']
    }

    const ok = await persistTicketDraft('http://localhost', {
      save_kind: 'generation',
      id_reclamation: 'REQ-1',
      id_skill: 'ticket.answer-ticket',
      generated_output: 'o'
    })

    expect(ok).toBe(true)
    expect(putTicketDraft).toHaveBeenCalledTimes(1)
  })
})
