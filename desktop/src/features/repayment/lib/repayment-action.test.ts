import { beforeEach, describe, expect, test } from 'bun:test'

import { loadCustomizationFixture } from '@/shared/lib/instance-customization.fixture'

import {
  getRepaymentActionByLabel,
  getRepaymentActionMeta,
  isRepaymentActionId,
  repaymentActionOptions,
  repaymentBulkActionOptions,
  repaymentDossierActionOptions
} from './repayment-action'

describe('repayment-action', () => {
  beforeEach(() => {
    loadCustomizationFixture()
  })

  test('les actes dossier et bulk proviennent du store', () => {
    expect(repaymentActionOptions().map((o) => o.label)).toEqual([
      'Analyser le dossier',
      'Joindre le locataire',
      'Envoyer un RCS de relance'
    ])
    expect(repaymentDossierActionOptions()).toHaveLength(2)
    expect(repaymentBulkActionOptions()).toHaveLength(1)
  })

  test('chaque motif a une couleur', () => {
    for (const option of repaymentActionOptions()) {
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
