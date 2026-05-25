import type { PutTicketDraftPayload } from '@/shared/types/ticket-draft'

/** IPC wrapper (testable without React hooks). */
export async function persistTicketDraft(
  url: string | undefined,
  payload: PutTicketDraftPayload
): Promise<boolean> {
  if (!url) return false
  const res = await window.api.putTicketDraft({ url, ...payload })
  return res?.ok === true
}
