import type { SortingState } from '@tanstack/react-table'

export function sanitizeColumnSorting(sorting: SortingState | undefined): SortingState {
  if (!sorting?.length) return []
  const item = sorting[0]
  if (!item?.id || item.id === 'evolution_solde') return []
  return [{ id: item.id, desc: Boolean(item.desc) }]
}
