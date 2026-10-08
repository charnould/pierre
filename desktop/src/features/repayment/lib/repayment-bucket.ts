import {
  type CaseBucketOption,
  normalizeCaseBucketOptions
} from '@/shared/lib/activities/case-workflow-config'
import { repaymentSetup } from '@/shared/lib/instance-customization'

import {
  departedPhase,
  RECLASSIFY_PHASE,
  resolveRepaymentPhase
} from '../../../../../shared/repayment-phases'

export { RECLASSIFY_PHASE }

export type RepaymentBucketId = string

function configuredPhases(): string[] {
  return repaymentSetup()
    .phases.map((phase) => phase.trim())
    .filter(Boolean)
}

export function repaymentBucketOptions(): CaseBucketOption[] {
  return normalizeCaseBucketOptions(
    configuredPhases().map((phase) => ({ id: phase, label: phase }))
  )
}

export function repaymentBucketIds(): RepaymentBucketId[] {
  return repaymentBucketOptions().map((option) => option.id)
}

export function defaultRepaymentPhase(): RepaymentBucketId {
  return repaymentBucketIds()[0] ?? RECLASSIFY_PHASE
}

export function departedRepaymentPhase(): RepaymentBucketId {
  return departedPhase(repaymentBucketIds())
}

function bucketById(): Record<string, CaseBucketOption> {
  return Object.fromEntries(
    [...repaymentBucketOptions(), { id: RECLASSIFY_PHASE, label: RECLASSIFY_PHASE }].map(
      (option) => [option.id, option]
    )
  )
}

export function isRepaymentBucketId(value: string): value is RepaymentBucketId {
  return value in bucketById()
}

export function getRepaymentBucketMeta(id: RepaymentBucketId): CaseBucketOption {
  return bucketById()[id] ?? { id, label: id }
}

export function resolveRepaymentBucket(stored: string | undefined): RepaymentBucketId {
  return resolveRepaymentPhase(stored, repaymentBucketIds())
}

/** Locataire parti : `statut` ledger dérivé (`ex-client` si absent de lots_locatifs). */
export function isDepartedTenantRow(row: Record<string, unknown>): boolean {
  return row['statut'] === 'ex-client'
}

export function resolveBucketForTenantRow(
  row: Record<string, unknown>,
  storedBucket: string | undefined
): RepaymentBucketId {
  if (isDepartedTenantRow(row)) return departedRepaymentPhase()
  return resolveRepaymentBucket(storedBucket)
}
