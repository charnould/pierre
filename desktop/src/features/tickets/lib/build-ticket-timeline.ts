import { getTicketCellText } from '@/shared/lib/ticket-row'
import type { TicketRow } from '@/shared/types'
import { is_boost_notification, type Activite } from '@/shared/types/activites'

export type TicketTimelineItem = {
  source: 'activity' | 'initial-reception'
  id: string
  date: string
  row: Activite
}

function mapActivityToEntry(row: Activite): TicketTimelineItem {
  return {
    source: 'activity',
    id: `activity:${row.id}`,
    date: row.date_creation,
    row
  }
}

function initialReception(ticket: TicketRow): TicketTimelineItem {
  const id = getTicketCellText(ticket, 'id_reclamation')
  const locataire =
    getTicketCellText(ticket, 'id_locataire') ||
    getTicketCellText(ticket, 'ids_locataires_concernes')
  const message =
    getTicketCellText(ticket, 'message_initial') || getTicketCellText(ticket, 'message')
  const date =
    getTicketCellText(ticket, 'cree_le') ||
    getTicketCellText(ticket, 'date_creation') ||
    getTicketCellText(ticket, 'date_reclamation') ||
    getTicketCellText(ticket, 'dernier_evenement_le') ||
    '1970-01-01T00:00:00Z'
  const row: Activite = {
    id: -1,
    date_creation: date,
    rattachement: `tickets:${id}`,
    auteur: 'tenant:Locataire',
    id_client: null,
    id_locataire: locataire || null,
    id_lot: getTicketCellText(ticket, 'id_lot') || null,
    type: 'email',
    statut: 'received',
    mentions: [],
    contenu: JSON.stringify({
      version: 1,
      objet: `Réclamation ${id}`,
      corps: message,
      reception_initiale: true
    })
  }
  return {
    source: 'initial-reception',
    id: `initial-reception:${id}`,
    date,
    row
  }
}

export function buildTicketTimeline(
  activities: Activite[],
  ticket?: TicketRow | null
): TicketTimelineItem[] {
  const items = activities.filter((row) => !is_boost_notification(row.type)).map(mapActivityToEntry)
  if (ticket) items.push(initialReception(ticket))
  return items.sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date)
    if (dateCmp !== 0) return dateCmp
    return b.id.localeCompare(a.id)
  })
}
