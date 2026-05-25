import type { TicketsColumnMeta } from '@/shared/types'

export const SKELETON_TICKET_COLUMNS: TicketsColumnMeta[] = [
  { name: 'id_reclamation', type: 'TEXT' },
  { name: 'id_locataire', type: 'TEXT' },
  { name: 'id_lot', type: 'TEXT' },
  { name: 'motif', type: 'TEXT' },
  { name: 'type_affaire', type: 'TEXT' }
]

/** Varied skeleton bar widths per column index for a less uniform look. */
export const SKELETON_CELL_WIDTH_CLASS = [
  'w-[72%]',
  'w-[55%]',
  'w-[80%]',
  'w-[60%]',
  'w-[45%]'
] as const
