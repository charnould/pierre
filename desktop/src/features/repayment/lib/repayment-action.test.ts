import { beforeEach, describe, expect, test } from 'bun:test'

import {
  CUSTOMIZATION_FIXTURE,
  loadCustomizationFixture
} from '@test/instance-customization-fixture'

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
      'Visiter à domicile',
      'Saisir la CTESI',
      'Saisir la CCPAPEX',
      'Envoyer un RCS de relance'
    ])
    expect(repaymentDossierActionOptions()).toHaveLength(5)
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

  test('dédoublonne dossier puis audience, la première occurrence gagne', () => {
    const repayments = CUSTOMIZATION_FIXTURE.repayments
    if (repayments == null) throw new Error('Configuration impayés absente')
    loadCustomizationFixture({
      repayments: {
        ...repayments,
        caseActions: ['Visiter à domicile', 'Joindre le locataire'],
        batchActions: ['Visiter à domicile', 'Envoyer un RCS de relance']
      }
    })
    expect(repaymentActionOptions().map((option) => option.label)).toEqual([
      'Visiter à domicile',
      'Joindre le locataire',
      'Envoyer un RCS de relance'
    ])
  })
})
