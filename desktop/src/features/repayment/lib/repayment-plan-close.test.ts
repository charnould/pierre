import { describe, expect, test } from 'bun:test'

import {
  isPlanCloseMotif,
  PLAN_CLOSE_MOTIF_LABELS,
  PLAN_CLOSE_MOTIFS
} from './repayment-plan-close'

describe('repayment-plan-close', () => {
  test('expose les 4 motifs avec labels', () => {
    expect(PLAN_CLOSE_MOTIFS).toEqual([
      'execution_complete',
      'non_respect',
      'remplacement_par_nouveau_plan',
      'effacement_de_dette'
    ])
    expect(PLAN_CLOSE_MOTIF_LABELS.execution_complete).toBe('Exécution terminée')
    expect(PLAN_CLOSE_MOTIF_LABELS.non_respect).toBe('Non-respect')
  })

  test('isPlanCloseMotif', () => {
    expect(isPlanCloseMotif('non_respect')).toBe(true)
    expect(isPlanCloseMotif('draft')).toBe(false)
    expect(isPlanCloseMotif('execution_complete')).toBe(true)
    expect(isPlanCloseMotif(null)).toBe(false)
  })
})
