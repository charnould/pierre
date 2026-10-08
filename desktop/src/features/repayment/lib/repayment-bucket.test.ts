import { beforeEach, describe, expect, test } from 'bun:test'

import { loadCustomizationFixture } from '@/shared/lib/instance-customization.fixture'

import {
  defaultRepaymentPhase,
  departedRepaymentPhase,
  getRepaymentBucketMeta,
  isDepartedTenantRow,
  RECLASSIFY_PHASE,
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
      'Non traités',
      'Recouvrement amiable',
      'Contentieux',
      'Clients partis'
    ])
    expect(new Set(repaymentBucketIds()).size).toBe(repaymentBucketIds().length)
  })

  test('une phase absente va dans À reclasser, une phase manquante dans la première', () => {
    expect(resolveRepaymentBucket(undefined)).toBe(defaultRepaymentPhase())
    expect(resolveRepaymentBucket('plan_soumis')).toBe(RECLASSIFY_PHASE)
    expect(resolveRepaymentBucket('prise_contact')).toBe(RECLASSIFY_PHASE)
  })

  test('resolveRepaymentBucket conserve une phase valide stockée', () => {
    expect(resolveRepaymentBucket('Recouvrement amiable')).toBe('Recouvrement amiable')
    expect(resolveRepaymentBucket('Contentieux')).toBe('Contentieux')
    expect(resolveRepaymentBucket(departedRepaymentPhase())).toBe('Clients partis')
  })

  test('getRepaymentBucketMeta expose le libellé', () => {
    expect(getRepaymentBucketMeta('Recouvrement amiable').label).toBe('Recouvrement amiable')
    expect(getRepaymentBucketMeta(RECLASSIFY_PHASE).label).toBe(RECLASSIFY_PHASE)
  })

  test('ex-client est forcé dans la dernière phase', () => {
    expect(isDepartedTenantRow({ statut: 'ex-client' })).toBe(true)
    expect(isDepartedTenantRow({ statut: 'client' })).toBe(false)
    expect(resolveBucketForTenantRow({ statut: 'ex-client' }, 'Recouvrement amiable')).toBe(
      departedRepaymentPhase()
    )
    expect(resolveBucketForTenantRow({ statut: 'client' }, 'Recouvrement amiable')).toBe(
      'Recouvrement amiable'
    )
  })
})
