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
    expect(html).toContain('Ajouter un adulte')
    expect(html).toContain('Ajouter un enfant')
    expect(html).toContain('Enregistrer')
    expect(html).toContain('LOC-1')
    expect(html).toContain('200,00')
  })
})
