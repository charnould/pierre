import { describe, expect, test } from 'bun:test'

import {
  defaultPhase,
  departedPhase,
  RECLASSIFY_PHASE,
  resolveRepaymentPhase
} from './repayment-phases'

const phases = ['Non traités', 'Contentieux', 'Clients partis']

describe('repayment phases', () => {
  test('résout l’absence, une phase connue et une phase retirée', () => {
    expect(resolveRepaymentPhase(undefined, phases)).toBe('Non traités')
    expect(resolveRepaymentPhase('  ', phases)).toBe('Non traités')
    expect(resolveRepaymentPhase('Contentieux', phases)).toBe('Contentieux')
    expect(resolveRepaymentPhase('amiable', phases)).toBe(RECLASSIFY_PHASE)
    expect(resolveRepaymentPhase('amiable', [])).toBe('amiable')
  })

  test('la première et la dernière phase portent les rôles automatiques', () => {
    expect(defaultPhase(phases)).toBe('Non traités')
    expect(departedPhase(phases)).toBe('Clients partis')
    expect(defaultPhase([])).toBe(RECLASSIFY_PHASE)
  })
})
