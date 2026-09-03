import { repaymentSetup } from '@/shared/lib/instance-customization'

import type { RepaymentBucketId } from './repayment-bucket'
import { PLAN_CLOSE_MOTIFS, type PlanCloseMotif } from './repayment-plan-close'

type PlanCloseConfigEntry = {
  bucketId: RepaymentBucketId
}

export type RepaymentCreatePlanConfig = {
  signedBucketId: RepaymentBucketId
  close: Record<PlanCloseMotif, PlanCloseConfigEntry>
}

export function repaymentCreatePlanConfig(): RepaymentCreatePlanConfig {
  const raw = repaymentSetup().create_plan as {
    signed_bucket_id: string
    close: Record<string, { bucket_id: string }>
  }

  const close = {} as Record<PlanCloseMotif, PlanCloseConfigEntry>
  for (const motif of PLAN_CLOSE_MOTIFS) {
    const entry = raw.close[motif]!
    close[motif] = {
      bucketId: entry.bucket_id
    }
  }

  return {
    signedBucketId: raw.signed_bucket_id,
    close
  }
}
