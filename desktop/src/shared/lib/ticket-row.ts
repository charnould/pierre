import type { TicketRow } from '@/shared/types'

import { hierarchyLeaf } from '../../../../shared/hierarchy'

/** Scalar values commonly stored in SQLite ticket cells. */
export type TicketCellValue = string | number | boolean | null

/**
 * Reads a ticket column value with a narrow return type.
 *
 * Unknown columns remain accessible; callers treat missing values as empty.
 */
export function getTicketCell(row: TicketRow, column: string): TicketCellValue {
  const value = row[column]
  if (value === undefined || value === null) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  return String(value)
}

/**
 * Returns a trimmed string suitable for display, filters, and URLs.
 */
export function getTicketCellText(row: TicketRow, column: string): string {
  const value = getTicketCell(row, column)
  if (value === null) return ''
  return String(value).trim()
}

/** Most specific stored segment of a `_hierarchie` column. */
export function getTicketHierarchyLabel(row: TicketRow, column: string): string {
  return hierarchyLeaf(getTicketCellText(row, column)) ?? ''
}

/**
 * Stable ticket identifier (`id_reclamation`) for row selection and deep links.
 */
export function getTicketId(row: TicketRow): string | null {
  const text = getTicketCellText(row, 'id_reclamation')
  return text.length > 0 ? text : null
}
