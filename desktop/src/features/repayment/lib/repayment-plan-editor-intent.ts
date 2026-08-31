import type { ApurementPlanFormData } from './apurement-plan/types'
import type { TenantRepaymentRow } from './classify-tenants'

export type RepaymentPlanEditorRequest = {
  tenant: TenantRepaymentRow
  activityId?: number
  form?: ApurementPlanFormData
  comment?: string
  /** Form + .docx export only — no activity persist. */
  exportOnly?: boolean
}

type Listener = (request: RepaymentPlanEditorRequest) => void

const listeners = new Set<Listener>()

export function subscribeRepaymentPlanEditor(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function requestRepaymentPlanEditor(request: RepaymentPlanEditorRequest): void {
  for (const listener of listeners) {
    listener(request)
  }
}
