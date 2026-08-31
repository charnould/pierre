import { describe, expect, mock, test } from 'bun:test'

mock.module('./outbound-email-templates.bundle', () => ({
  listOutboundTemplates: () => [
    {
      channel: 'rcs',
      id: 'locataire_rcs_relance_impaye',
      group: 'RCS au locataire',
      action: 'Envoyer un RCS de relance',
      label: 'Relance impayé',
      body: ''
    },
    {
      channel: 'mailto',
      id: 'caf_email_retablir_versement_apl',
      group: 'Courriel à la CAF',
      action: 'Contacter la CAF',
      to: 'caf',
      label: 'Rétablir le versement APL',
      subject: '',
      body: '',
      email: null
    }
  ]
}))

const { actionForTemplate } = await import('./repayment-template-actions')

describe('repayment-template-actions', () => {
  test('actionForTemplate lit le champ action du modèle', () => {
    expect(actionForTemplate('locataire_rcs_relance_impaye')).toBe('Envoyer un RCS de relance')
    expect(actionForTemplate('caf_email_retablir_versement_apl')).toBe('Contacter la CAF')
  })

  test('actionForTemplate retourne null pour un id inconnu', () => {
    expect(actionForTemplate('template_inexistant')).toBeNull()
  })
})
