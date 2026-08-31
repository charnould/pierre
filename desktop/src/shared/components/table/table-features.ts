import {
  columnOrderingFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures
} from '@tanstack/react-table'

/** Shared TanStack Table v9 features for tickets + repayment data tables. */
export const pierreTableFeatures = tableFeatures({
  rowSortingFeature,
  columnOrderingFeature,
  columnVisibilityFeature,
  columnSizingFeature,
  columnResizingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    basic: sortFn_basic,
    text: sortFn_text,
    alphanumeric: sortFn_alphanumeric
  }
})

export type PierreTableFeatures = typeof pierreTableFeatures
