import { emptyRepaymentForms, type RepaymentForms } from '../../../../../shared/repayment-plan'
import type { TenantRepaymentRow } from './classify-tenants'

export type RepaymentPlanEditorRequest = {
  tenant: TenantRepaymentRow
  activityId?: number
  dossier?: RepaymentForms
}

type Listener = (request: RepaymentPlanEditorRequest) => void

const listeners = new Set<Listener>()

export function subscribeRepaymentPlanEditor(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Plan form with nothing prefilled from the ledger. */
export function blankPlanEditorRequest(): RepaymentPlanEditorRequest {
  return {
    tenant: { id_locataire: '', id_client: '', solde_locataire: 0 },
    dossier: emptyRepaymentForms()
  }
}

export function requestRepaymentPlanEditor(request: RepaymentPlanEditorRequest): void {
  for (const listener of listeners) listener(request)
}
