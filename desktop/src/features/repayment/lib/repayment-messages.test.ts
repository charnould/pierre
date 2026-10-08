import { describe, expect, test } from 'bun:test'

import type { TenantRepaymentRow } from './classify-tenants'
import { resolveRepaymentEmail, resolveRepaymentRcs } from './repayment-messages'

const tenant = {
  id_locataire: 'LOC-1',
  id_client: 'CLI-1',
  solde_locataire: 120,
  email_client: 'locataire@example.org',
  telephone_client: '0601020304'
} satisfies TenantRepaymentRow

describe('repayment message resolution', () => {
  test('substitutes the tenant and keeps the action', () => {
    expect(
      resolveRepaymentRcs(
        {
          kind: 'rcs',
          group: 'RCS',
          action: 'Relancer',
          label: 'Relance',
          body: 'Réf {{id_locataire}}',
          sms_fallback: 'SMS {{id_locataire}}',
          choices: []
        },
        tenant
      )
    ).toEqual({
      action: 'Relancer',
      body: 'Réf LOC-1',
      sms_fallback: 'SMS LOC-1',
      choices: []
    })
    const email = resolveRepaymentEmail(
      {
        kind: 'email',
        to: 'caf',
        group: 'CAF',
        action: 'Contacter la CAF',
        label: 'Quittances',
        subject: 'Dossier {{id_locataire}}',
        body: 'Bonjour',
        email: 'caf@example.fr'
      },
      tenant
    )
    expect(email.action).toBe('Contacter la CAF')
    expect(email.toAddress).toBe('caf@example.fr')
    expect(email.subject).toBe('Dossier LOC-1')
    expect(email.mailtoUrl.startsWith('mailto:caf@example.fr?')).toBe(true)
  })
})
