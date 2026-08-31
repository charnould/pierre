export function generateTicketIds() {
  return {
    id_reclamation: `reclamation-${crypto.randomUUID()}`,
    id_locataire: `locataire-${crypto.randomUUID()}`
  }
}
