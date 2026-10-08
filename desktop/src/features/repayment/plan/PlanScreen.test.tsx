import { afterEach, describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { resetCustomization } from '@/shared/lib/instance-customization'
import { loadCustomizationFixture } from '@/shared/lib/instance-customization.fixture'

import { PlanScreen } from './PlanScreen'

afterEach(() => resetCustomization())

describe('PlanScreen', () => {
  test('affiche l’ajout d’un adulte et l’enregistrement', () => {
    loadCustomizationFixture()
    const html = renderToStaticMarkup(
      <PlanScreen
        tenant={{ id_locataire: 'LOC-1', id_client: 'CLI-1', solde_locataire: 1200 }}
        onClose={() => {}}
      />
    )
    expect(html.indexOf('Identification')).toBeLessThan(html.indexOf('Bail'))
    expect(html.indexOf('Membres du foyer')).toBeLessThan(html.indexOf('Compte locataire'))
    expect(html.indexOf('Budget du foyer')).toBeLessThan(html.indexOf('Accompagnement'))
    expect(html.indexOf('Diagnostic social et financier')).toBeLessThan(
      html.indexOf('Plan d’apurement')
    )
    expect(html.indexOf('Plan d’apurement')).toBeLessThan(html.lastIndexOf('Échéancier'))
    expect(html).not.toContain('Reprendre la proposition du diagnostic')
    expect(html).not.toContain('Reprendre le plan d’apurement')
    expect(html).toContain('Ajouter un adulte')
    expect(html).toContain('Ajouter un enfant')
    expect(html).toContain('Enregistrer')
    expect(html).toContain('LOC-1')
    expect(html).toContain('200,00')
  })
})
