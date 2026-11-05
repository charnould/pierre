import { beforeEach, describe, expect, test } from 'bun:test'

import { loadCustomizationFixture } from '@/shared/lib/instance-customization.fixture'

import { RECLASSIFY_PHASE } from '../../../../../shared/repayment-phases'
import type { TenantRepaymentRow } from './classify-tenants'
import { groupRepaymentRowsByBucket } from './group-repayment-rows-by-bucket'
import {
  departedRepaymentPhase,
  type RepaymentBucketId,
  repaymentBucketIds,
  resolveBucketForTenantRow
} from './repayment-bucket'

function row(id: string, overrides: Partial<TenantRepaymentRow> = {}): TenantRepaymentRow {
  return {
    id_locataire: id,
    id_client: `C-${id}`,
    statut: 'client',
    ...overrides
  } as TenantRepaymentRow
}

describe('groupRepaymentRowsByBucket', () => {
  beforeEach(() => {
    loadCustomizationFixture()
  })

  test('returns one section per phase in config order', () => {
    const getBucket = (r: TenantRepaymentRow): RepaymentBucketId =>
      resolveBucketForTenantRow(
        r,
        r.id_locataire === 'a'
          ? 'Recouvrement amiable'
          : r.id_locataire === 'c'
            ? 'Contentieux'
            : r.id_locataire === 'x'
              ? 'ancienne phase'
              : 'Non traités'
      )

    const sections = groupRepaymentRowsByBucket(
      [row('a'), row('b'), row('c'), row('d', { statut: 'ex-client' }), row('x')],
      getBucket
    )

    expect(sections.map((s) => s.bucket)).toEqual([...repaymentBucketIds(), RECLASSIFY_PHASE])
    expect(
      sections.find((s) => s.bucket === 'Recouvrement amiable')?.rows.map((r) => r.id_locataire)
    ).toEqual(['a'])
    expect(
      sections.find((s) => s.bucket === 'Non traités')?.rows.map((r) => r.id_locataire)
    ).toEqual(['b'])
    expect(
      sections.find((s) => s.bucket === departedRepaymentPhase())?.rows.map((r) => r.id_locataire)
    ).toEqual(['d'])
    expect(
      sections.find((s) => s.bucket === RECLASSIFY_PHASE)?.rows.map((r) => r.id_locataire)
    ).toEqual(['x'])
  })
})
