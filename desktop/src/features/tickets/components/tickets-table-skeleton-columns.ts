import type { TicketsColumnMeta } from '@/shared/types'

export const SKELETON_TICKET_COLUMNS: TicketsColumnMeta[] = [
  { name: 'id_reclamation', type: 'TEXT' },
  { name: 'id_locataire', type: 'TEXT' },
  { name: 'id_lot', type: 'TEXT' },
  { name: 'motif', type: 'TEXT' },
  { name: 'type_affaire', type: 'TEXT' }
]
