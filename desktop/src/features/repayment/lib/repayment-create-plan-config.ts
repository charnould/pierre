import repaymentConfig from '@customization/repayments/config'

import type { RepaymentBucketId } from './repayment-bucket'
import { PLAN_CLOSE_MOTIFS, type PlanCloseMotif } from './repayment-plan-close'

type PlanCloseConfigEntry = {
  bucketId: RepaymentBucketId
}

export type RepaymentCreatePlanConfig = {
  signedBucketId: RepaymentBucketId
  close: Record<PlanCloseMotif, PlanCloseConfigEntry>
}

function buildCreatePlanConfig(): RepaymentCreatePlanConfig {
  const raw = repaymentConfig.create_plan as {
    signed_bucket_id: string
    close: Record<string, { bucket_id: string }>
  }

  const close = {} as Record<PlanCloseMotif, PlanCloseConfigEntry>
  for (const motif of PLAN_CLOSE_MOTIFS) {
    const entry = raw.close[motif]!
    close[motif] = {
      bucketId: entry.bucket_id as RepaymentBucketId
    }
  }

  return {
    signedBucketId: raw.signed_bucket_id as RepaymentBucketId,
    close
  }
}

export const REPAYMENT_CREATE_PLAN_CONFIG = buildCreatePlanConfig()
