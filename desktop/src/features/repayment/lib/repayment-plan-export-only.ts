import type { TenantRepaymentRow } from './classify-tenants'
import type { RepaymentPlanEditorRequest } from './repayment-plan-editor-intent'

/** Synthetic tenant for export-only plans when the ledger table is missing. */
export function createExportOnlyPlanTenant(): TenantRepaymentRow {
  return { id_locataire: '', id_client: '', solde_locataire: 0 }
}

export function createExportOnlyPlanEditorRequest(): RepaymentPlanEditorRequest {
  return { tenant: createExportOnlyPlanTenant(), exportOnly: true }
}

export function planWorkspaceFooterVisibility(
  exportOnly: boolean,
  hasActivity: boolean,
  signed: boolean
): {
  showDelete: boolean
  showClose: boolean
  showExport: boolean
  showSave: boolean
} {
  return {
    showDelete: !exportOnly && hasActivity && !signed,
    showClose: !exportOnly && hasActivity && signed,
    showExport: true,
    showSave: !exportOnly && !signed
  }
}
