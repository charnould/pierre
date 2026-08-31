import type { LedgerRow } from '@/shared/types/ledger'

import type { TenantRepaymentRow } from './classify-tenants'

function str(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function optionalNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function mapLedgerRowToTenantRepaymentRow(row: LedgerRow): TenantRepaymentRow {
  return {
    ...row,
    id_locataire: str(row.id_locataire),
    id_client: str(row.id_client),
    solde_locataire: num(row.solde_locataire),
    ratio_dette_loyer: optionalNum(row.ratio_dette_loyer)
  }
}
