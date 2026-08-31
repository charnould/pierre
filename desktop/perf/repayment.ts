import { groupRepaymentRowsByBucket } from '../src/features/repayment/lib/group-repayment-rows-by-bucket'
import { mapLedgerRowToTenantRepaymentRow } from '../src/features/repayment/lib/map-ledger-row'
import { resolveBucketForTenantRow } from '../src/features/repayment/lib/repayment-bucket'
import {
  collectFilterFacets,
  filterRepaymentRows
} from '../src/features/repayment/lib/repayment-column-filters'

export type Repayment10kMetrics = {
  rows: 10_000
  mapMs: number
  groupMs: number
  filterMs: number
  facetMs: number
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

const duration = (work: () => void): number => {
  const startedAt = performance.now()
  work()
  return performance.now() - startedAt
}

export function measureRepayment10k(): Repayment10kMetrics {
  const rawRows = Array.from({ length: 10_000 }, (_, index) => ({
    id_client: `CLIENT-${index}`,
    id_locataire: `TENANT-${index}`,
    id_lot: `LOT-${index}`,
    nom_locataire: `Locataire ${index}`,
    solde_locataire: 10_000 - index,
    ratio_dette_loyer: (index % 30) / 10,
    statut: index % 5 === 0 ? 'ex-client' : 'locataire',
    gestionnaire: `gestionnaire-${index % 25}@example.test`
  }))
  const samples = {
    mapMs: [] as number[],
    groupMs: [] as number[],
    filterMs: [] as number[],
    facetMs: [] as number[]
  }

  for (let iteration = 0; iteration < 7; iteration += 1) {
    let rows = rawRows.map(mapLedgerRowToTenantRepaymentRow)
    samples.mapMs.push(
      duration(() => {
        rows = rawRows.map(mapLedgerRowToTenantRepaymentRow)
      })
    )
    samples.groupMs.push(
      duration(() => {
        groupRepaymentRowsByBucket(rows, (row) => resolveBucketForTenantRow(row, null))
      })
    )
    samples.filterMs.push(
      duration(() => {
        filterRepaymentRows(rows, { statut: ['locataire'] })
      })
    )
    samples.facetMs.push(
      duration(() => {
        collectFilterFacets('gestionnaire', rows)
      })
    )
  }

  return {
    rows: 10_000,
    mapMs: median(samples.mapMs),
    groupMs: median(samples.groupMs),
    filterMs: median(samples.filterMs),
    facetMs: median(samples.facetMs)
  }
}
