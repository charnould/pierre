import { beforeEach, describe, expect, test } from 'bun:test'

import { loadCustomizationFixture } from '@/shared/lib/instance-customization.fixture'

import { repaymentCreatePlanConfig } from './repayment-create-plan-config'

describe('repayment-create-plan-config', () => {
  beforeEach(() => {
    loadCustomizationFixture()
  })

  test('lit la phase du plan signé depuis le store', () => {
    expect(repaymentCreatePlanConfig().signedBucketId).toBe('amiable')
  })

  test('lit la durée et les seuils de l’échéancier', () => {
    expect(repaymentCreatePlanConfig().schedule).toEqual({
      defaultMonths: 6,
      maxEffortRate: 35,
      minDailyRemainder: 15,
      thresholds: [
        { months: 12, message: 'Un échéancier de plus de 12 mensualités doit être confirmé.' },
        {
          months: 24,
          message:
            'Un plan d’apurement de plus de 24 mensualités est réservé à des cas spéciaux documentés au sein de votre organisme.'
        }
      ]
    })
  })

  test('chaque motif de clôture a une phase', () => {
    const close = repaymentCreatePlanConfig().close
    expect(close.execution_complete).toEqual({ bucketId: 'non_traites' })
    expect(close.non_respect).toEqual({ bucketId: 'contentieux' })
    expect(close.remplacement_par_nouveau_plan).toEqual({ bucketId: 'amiable' })
    expect(close.effacement_de_dette).toEqual({ bucketId: 'non_traites' })
  })
})
