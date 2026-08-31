import { describe, expect, test } from 'bun:test'

import repaymentConfig from '@customization/repayments/config'

import {
  getRepaymentActionByLabel,
  getRepaymentActionMeta,
  isRepaymentActionId,
  REPAYMENT_ACTION_OPTIONS,
  REPAYMENT_BULK_ACTION_OPTIONS,
  REPAYMENT_DOSSIER_ACTION_OPTIONS
} from './repayment-action'

describe('repayment-action', () => {
  test('les actes dossier et bulk proviennent de la configuration', () => {
    const configured = [
      ...repaymentConfig.actions.dossier,
      ...repaymentConfig.actions.bulk_operations
    ]
    expect(REPAYMENT_ACTION_OPTIONS.map((o) => o.label)).toEqual(configured)
    expect(REPAYMENT_DOSSIER_ACTION_OPTIONS).toHaveLength(repaymentConfig.actions.dossier.length)
    expect(REPAYMENT_BULK_ACTION_OPTIONS).toHaveLength(
      repaymentConfig.actions.bulk_operations.length
    )
  })

  test('chaque motif a une couleur', () => {
    for (const option of REPAYMENT_ACTION_OPTIONS) {
      expect(option.color.bgColor).toMatch(/^#[0-9A-F]{6}$/)
      expect(option.color.textColor).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  test('utilise le libellé comme identité sans slug', () => {
    const label = 'Analyser le dossier'
    expect(getRepaymentActionByLabel(label)?.id).toBe(label)
    expect(getRepaymentActionMeta(label).label).toBe(label)
  })

  test('accepte aussi une action libre absente de la configuration', () => {
    expect(isRepaymentActionId('Contacter le garant')).toBe(true)
    expect(getRepaymentActionMeta('Contacter le garant').label).toBe('Contacter le garant')
  })
})
