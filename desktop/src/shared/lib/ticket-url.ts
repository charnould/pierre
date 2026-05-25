/** Placeholders in `customization/desktop/config.ts` → `ticket_url_pattern`. */
const PLACEHOLDER_REQUEST_ID = '{id_reclamation}'

export function resolveTicketUrl(ticketId: string, pattern: string): string {
  const encodedId = encodeURIComponent(ticketId.trim())
  return pattern.replaceAll(PLACEHOLDER_REQUEST_ID, encodedId)
}
