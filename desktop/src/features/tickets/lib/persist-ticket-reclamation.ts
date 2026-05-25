import type { PutTicketPayload } from '@/shared/types/tickets'

/** IPC wrapper (testable without React hooks). */
export async function persistTicketReclamation(
  url: string | undefined,
  payload: PutTicketPayload
): Promise<boolean> {
  if (!url) return false
  const res = await window.api.putTicket({ url, ...payload })
  return res?.ok === true
}
