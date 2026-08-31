import type { RepaymentActionId } from './repayment-action'

export interface TenantLastAction {
  action: RepaymentActionId
  date: string
}
