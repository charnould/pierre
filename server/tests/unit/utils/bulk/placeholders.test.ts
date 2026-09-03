import { describe, expect, it } from 'bun:test'

import type { BulkDelivery } from '../../../../../shared/bulk-operations'
import {
  apply_placeholders,
  collect_placeholders,
  delivery_placeholders,
  render_content,
  stringify_placeholder_value,
  unresolved_placeholders
} from '../../../../utils/bulk/placeholders'

describe('placeholders', () => {
  it('collecte les clés dans une chaîne et un objet RCS', () => {
    expect(
      [...collect_placeholders('Bonjour {{ nom_locataire }} ({{id_locataire}})')].sort()
    ).toEqual(['id_locataire', 'nom_locataire'])
    expect([
      ...collect_placeholders({
        conversation: [{ text: 'Réf. {{id_locataire}}' }, { amount: 12 }]
      })
    ]).toEqual(['id_locataire'])
  })

  it('remplace uniquement les chaînes, récursivement', () => {
    expect(apply_placeholders('{{nom}} — {{manquant}}', { nom: 'Ada' })).toBe('Ada — {{manquant}}')
    expect(
      apply_placeholders({ conversation: [{ text: 'Hi {{nom}}' }], n: 3 }, { nom: 'Ada' })
    ).toEqual({ conversation: [{ text: 'Hi Ada' }], n: 3 })
  })

  it('signale les placeholders encore présents après rendu', () => {
    expect(unresolved_placeholders('ok {{reste}}')).toEqual(['reste'])
    expect(unresolved_placeholders({ text: 'ok' })).toEqual([])
  })

  it('stringify les valeurs de requête', () => {
    expect(stringify_placeholder_value(null)).toBe('')
    expect(stringify_placeholder_value(12.5)).toBe('12.5')
    expect(stringify_placeholder_value(true)).toBe('oui')
    expect(stringify_placeholder_value(false)).toBe('non')
    expect(stringify_placeholder_value('  x  ')).toBe('x')
    expect(stringify_placeholder_value('2026-08-28')).toBe('2026-08-28')
    expect(stringify_placeholder_value('2026-08-28T14:30:00Z')).toBe('2026-08-28T14:30:00Z')
    expect(stringify_placeholder_value('001234')).toBe('001234')
  })

  it('collecte les placeholders inline et applique les bindings exacts', () => {
    const delivery: BulkDelivery = {
      kind: 'fallback',
      steps: [
        {
          medium: 'email',
          action: 'Relancer',
          subject: 'Solde {{montant}}',
          body: 'Au {{date}}',
          placeholderBindings: { montant: 'solde_locataire', date: 'date_du_jour' }
        }
      ]
    }
    expect([...delivery_placeholders(delivery)]).toEqual(['montant', 'date'])
    const firstStep = delivery.steps[0]
    if (firstStep.medium !== 'email') throw new Error('Expected email delivery step')
    expect(
      render_content(
        { subject: firstStep.subject, body: firstStep.body },
        firstStep.placeholderBindings,
        { solde_locataire: 12 },
        new Date(2026, 7, 28)
      )
    ).toEqual({ subject: 'Solde 12', body: 'Au 28/08/2026' })
    expect(() => render_content('{{montant}}', {}, { solde_locataire: 12 }, new Date())).toThrow(
      /Bindings manquants/
    )
    expect(() =>
      render_content(
        '{{montant}}',
        { montant: 'colonne_supprimee' },
        { solde_locataire: 12 },
        new Date()
      )
    ).toThrow(/Colonne inconnue/)
  })
})
