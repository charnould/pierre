import { describe, expect, test } from 'bun:test'

import type { TenantRepaymentRow } from './classify-tenants'
import { groupRepaymentRowsByBucket } from './group-repayment-rows-by-bucket'
import {
  CLIENTS_PARTIS_BUCKET_ID,
  REPAYMENT_BUCKET_IDS,
  resolveBucketForTenantRow,
  type RepaymentBucketId
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
  test('returns one section per phase in config order', () => {
    const getBucket = (r: TenantRepaymentRow): RepaymentBucketId =>
      resolveBucketForTenantRow(
        r,
        r.id_locataire === 'a' ? 'amiable' : r.id_locataire === 'c' ? 'contentieux' : 'non_traites'
      )

    const sections = groupRepaymentRowsByBucket(
      [row('a'), row('b'), row('c'), row('d', { statut: 'ex-client' })],
      getBucket
    )

    expect(sections.map((s) => s.bucket)).toEqual([...REPAYMENT_BUCKET_IDS])
    expect(sections.find((s) => s.bucket === 'amiable')?.rows.map((r) => r.id_locataire)).toEqual([
      'a'
    ])
    expect(
      sections.find((s) => s.bucket === 'non_traites')?.rows.map((r) => r.id_locataire)
    ).toEqual(['b'])
    expect(
      sections.find((s) => s.bucket === CLIENTS_PARTIS_BUCKET_ID)?.rows.map((r) => r.id_locataire)
    ).toEqual(['d'])
  })
})
