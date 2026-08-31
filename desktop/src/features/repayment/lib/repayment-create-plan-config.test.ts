import { describe, expect, test } from 'bun:test'

import repaymentConfig from '@customization/repayments/config'

import { REPAYMENT_CREATE_PLAN_CONFIG } from './repayment-create-plan-config'

describe('repayment-create-plan-config', () => {
  test('lit la phase du plan signé depuis config.ts', () => {
    const raw = repaymentConfig.create_plan
    expect(raw?.signed_bucket_id).toBe('plan_apurement_en_cours')
    expect(REPAYMENT_CREATE_PLAN_CONFIG.signedBucketId).toBe('plan_apurement_en_cours')
  })

  test('chaque motif de clôture a une phase valide', () => {
    const close = REPAYMENT_CREATE_PLAN_CONFIG.close
    expect(close.execution_complete).toEqual({ bucketId: 'clos' })
    expect(close.non_respect).toEqual({ bucketId: 'pre_contentieux' })
    expect(close.remplacement_par_nouveau_plan).toEqual({ bucketId: 'amiable' })
    expect(close.effacement_de_dette).toEqual({ bucketId: 'clos' })
  })
})
