import repaymentConfig from '@customization/repayments/config'

import {
  normalizeCaseBucketOptions,
  type CaseBucketOption
} from '@/shared/lib/activities/case-workflow-config'

/** Point d’entrée du parcours : défaut si bucket absent / invalide. */
export const NON_TRAITES_BUCKET_ID = 'non_traites'

/** Bucket auto pour les locataires absents de `lots_locatifs` (`statut` = ex-client). */
export const CLIENTS_PARTIS_BUCKET_ID = 'clients_partis'

function buildBucketOptions(): CaseBucketOption[] {
  return normalizeCaseBucketOptions(repaymentConfig.buckets)
}

export const REPAYMENT_BUCKET_OPTIONS = buildBucketOptions()

export type RepaymentBucketId = (typeof REPAYMENT_BUCKET_OPTIONS)[number]['id']

export const REPAYMENT_BUCKET_IDS = REPAYMENT_BUCKET_OPTIONS.map(
  (option) => option.id
) as RepaymentBucketId[]

const BUCKET_BY_ID = Object.fromEntries(
  REPAYMENT_BUCKET_OPTIONS.map((option) => [option.id, option])
) as Record<RepaymentBucketId, CaseBucketOption>

if (!(NON_TRAITES_BUCKET_ID in BUCKET_BY_ID)) {
  throw new Error(
    `repayment.buckets: le bucket système « ${NON_TRAITES_BUCKET_ID} » est requis (customization/repayments/config.ts)`
  )
}
if (!(CLIENTS_PARTIS_BUCKET_ID in BUCKET_BY_ID)) {
  throw new Error(
    `repayment.buckets: le bucket système « ${CLIENTS_PARTIS_BUCKET_ID} » est requis (customization/repayments/config.ts)`
  )
}

export function isRepaymentBucketId(value: string): value is RepaymentBucketId {
  return value in BUCKET_BY_ID
}

export function getRepaymentBucketMeta(id: RepaymentBucketId): CaseBucketOption {
  return BUCKET_BY_ID[id]
}

export function resolveRepaymentBucket(stored: string | undefined): RepaymentBucketId {
  if (stored && isRepaymentBucketId(stored)) return stored
  return NON_TRAITES_BUCKET_ID as RepaymentBucketId
}

/** Locataire parti : `statut` ledger dérivé (`ex-client` si absent de lots_locatifs). */
export function isDepartedTenantRow(row: Record<string, unknown>): boolean {
  return row['statut'] === 'ex-client'
}

export function resolveBucketForTenantRow(
  row: Record<string, unknown>,
  storedBucket: string | undefined
): RepaymentBucketId {
  if (isDepartedTenantRow(row)) return CLIENTS_PARTIS_BUCKET_ID
  return resolveRepaymentBucket(storedBucket)
}
