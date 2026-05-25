export function generateTicketIds() {
  return {
    id_reclamation: `reclamation-${crypto.randomUUID()}`,
    id_locataire: `locataire-${crypto.randomUUID()}`
  }
}

export function needsGeneratedTicketIds(ticketNumber: string, tenantNumber: string) {
  return !ticketNumber.trim() && !tenantNumber.trim()
}
