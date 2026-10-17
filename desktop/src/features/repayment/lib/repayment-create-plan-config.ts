import { repaymentSetup } from '@/shared/lib/instance-customization'

import type { RepaymentBucketId } from './repayment-bucket'
import type { PlanCloseMotif } from './repayment-plan-close'

export type ScheduleThreshold = {
  months: number
  message: string
}

export type RepaymentCreatePlanConfig = {
  signedBucketId: RepaymentBucketId
  close: Record<PlanCloseMotif, { bucketId: RepaymentBucketId }>
  schedule: {
    defaultMonths: number
    thresholds: ScheduleThreshold[]
    /** Pourcent. */
    maxEffortRate: number
    /** Euros, reste à vivre journalier. */
    minDailyRemainder: number
  }
}

export function repaymentCreatePlanConfig(): RepaymentCreatePlanConfig {
  return repaymentSetup().create_plan as RepaymentCreatePlanConfig
}
