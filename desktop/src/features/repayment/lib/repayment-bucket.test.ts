import { describe, expect, test } from 'bun:test'

import repaymentConfig from '@customization/repayments/config'

import {
  CLIENTS_PARTIS_BUCKET_ID,
  getRepaymentBucketMeta,
  isDepartedTenantRow,
  NON_TRAITES_BUCKET_ID,
  REPAYMENT_BUCKET_IDS,
  resolveBucketForTenantRow,
  resolveRepaymentBucket
} from './repayment-bucket'

describe('repayment-bucket', () => {
  test('les phases système obligatoires sont présentes', () => {
    expect(REPAYMENT_BUCKET_IDS).toContain(NON_TRAITES_BUCKET_ID)
    expect(REPAYMENT_BUCKET_IDS).toContain(CLIENTS_PARTIS_BUCKET_ID)

    // Les ids attendus par le code métier.
    for (const id of ['amiable', 'pre_contentieux', 'contentieux', 'post_jugement']) {
      expect(REPAYMENT_BUCKET_IDS).toContain(id)
    }

    // L’ordre vient de la config (l’opérateur le choisit), il n’est pas retrié.
    expect(REPAYMENT_BUCKET_IDS).toEqual(repaymentConfig.buckets.map((entry) => entry.id))

    for (const entry of repaymentConfig.buckets) {
      expect(typeof entry).toBe('object')
      expect(typeof entry.id).toBe('string')
      expect(typeof entry.label).toBe('string')
    }

    expect(new Set(REPAYMENT_BUCKET_IDS).size).toBe(REPAYMENT_BUCKET_IDS.length)
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

  test('getRepaymentBucketMeta expose le label depuis la config', () => {
    const meta = getRepaymentBucketMeta('amiable')
    const configEntry = repaymentConfig.buckets.find((entry) => entry.id === 'amiable')
    expect(configEntry).toBeDefined()
    expect(meta.label).toBe(configEntry!.label)
  })

  test('l’id est celui déclaré en config (pas dérivé du label)', () => {
    expect(getRepaymentBucketMeta(NON_TRAITES_BUCKET_ID).label).not.toBe(NON_TRAITES_BUCKET_ID)
    expect(REPAYMENT_BUCKET_IDS).toContain(CLIENTS_PARTIS_BUCKET_ID)
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
