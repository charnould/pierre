import { beforeEach, describe, expect, test } from 'bun:test'

import { loadCustomizationFixture } from '@/shared/lib/instance-customization.fixture'

import {
  CLIENTS_PARTIS_BUCKET_ID,
  getRepaymentBucketMeta,
  isDepartedTenantRow,
  NON_TRAITES_BUCKET_ID,
  repaymentBucketIds,
  resolveBucketForTenantRow,
  resolveRepaymentBucket
} from './repayment-bucket'

describe('repayment-bucket', () => {
  beforeEach(() => {
    loadCustomizationFixture()
  })

  test('lit les phases depuis le store, dans l’ordre', () => {
    expect(repaymentBucketIds()).toEqual([
      NON_TRAITES_BUCKET_ID,
      'amiable',
      'contentieux',
      CLIENTS_PARTIS_BUCKET_ID
    ])
    expect(new Set(repaymentBucketIds()).size).toBe(repaymentBucketIds().length)
  })

  test('resolveRepaymentBucket retombe sur non_traites par défaut', () => {
    expect(resolveRepaymentBucket(undefined)).toBe(NON_TRAITES_BUCKET_ID)
    expect(resolveRepaymentBucket('plan_soumis')).toBe(NON_TRAITES_BUCKET_ID)
    expect(resolveRepaymentBucket('prise_contact')).toBe(NON_TRAITES_BUCKET_ID)
  })

  test('resolveRepaymentBucket conserve une phase valide stockée', () => {
    expect(resolveRepaymentBucket('amiable')).toBe('amiable')
    expect(resolveRepaymentBucket('contentieux')).toBe('contentieux')
    expect(resolveRepaymentBucket(CLIENTS_PARTIS_BUCKET_ID)).toBe(CLIENTS_PARTIS_BUCKET_ID)
  })

  test('getRepaymentBucketMeta expose le label depuis le store', () => {
    expect(getRepaymentBucketMeta('amiable').label).toBe('Recouvrement amiable')
    expect(getRepaymentBucketMeta(NON_TRAITES_BUCKET_ID).label).not.toBe(NON_TRAITES_BUCKET_ID)
  })

  test('ex-client est forcé en clients_partis', () => {
    expect(isDepartedTenantRow({ statut: 'ex-client' })).toBe(true)
    expect(isDepartedTenantRow({ statut: 'client' })).toBe(false)
    expect(resolveBucketForTenantRow({ statut: 'ex-client' }, 'amiable')).toBe(
      CLIENTS_PARTIS_BUCKET_ID
    )
    expect(resolveBucketForTenantRow({ statut: 'client' }, 'amiable')).toBe('amiable')
  })
})
