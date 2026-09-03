import {
  normalizeCaseBucketOptions,
  type CaseBucketOption
} from '@/shared/lib/activities/case-workflow-config'
import { repaymentSetup } from '@/shared/lib/instance-customization'

/** Point d’entrée du parcours : défaut si bucket absent / invalide. */
export const NON_TRAITES_BUCKET_ID = 'non_traites'

/** Bucket auto pour les locataires absents de `lots_locatifs` (`statut` = ex-client). */
export const CLIENTS_PARTIS_BUCKET_ID = 'clients_partis'

export type RepaymentBucketId = string

export function repaymentBucketOptions(): CaseBucketOption[] {
  return normalizeCaseBucketOptions(repaymentSetup().buckets)
}

export function repaymentBucketIds(): RepaymentBucketId[] {
  return repaymentBucketOptions().map((option) => option.id)
}

function bucketById(): Record<string, CaseBucketOption> {
  return Object.fromEntries(repaymentBucketOptions().map((option) => [option.id, option]))
}

export function isRepaymentBucketId(value: string): value is RepaymentBucketId {
  return value in bucketById()
}

export function getRepaymentBucketMeta(id: RepaymentBucketId): CaseBucketOption {
  return bucketById()[id] ?? { id, label: id }
}

export function resolveRepaymentBucket(stored: string | undefined): RepaymentBucketId {
  if (stored && isRepaymentBucketId(stored)) return stored
  return NON_TRAITES_BUCKET_ID
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
