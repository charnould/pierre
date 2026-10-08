import { describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { BoardCanvas, BoardPhaseSection } from './board-surface'

describe('BoardPhaseSection', () => {
  test('le canvas garde une seule barre globale respirante', () => {
    const markup = renderToStaticMarkup(
      <BoardCanvas toolbar={<span>Actualiser</span>}>{() => <p>Phases</p>}</BoardCanvas>
    )

    expect(markup).toContain('h-9')
    expect(markup).toContain('Actualiser')
    expect(markup).toContain('Phases')
  })

  test('une phase vide reste une rubrique compacte sans actions ni corps', () => {
    const markup = renderToStaticMarkup(
      <BoardPhaseSection
        title="Moratoire"
        meta="0 dossier"
        empty
        actions={<span>Colonnes</span>}
        note="Aucun dossier dans cette phase."
      >
        <p>Table</p>
      </BoardPhaseSection>
    )

    expect(markup).toContain('data-empty="true"')
    expect(markup).toContain('Moratoire')
    expect(markup).toContain('0 dossier')
    expect(markup).not.toContain('Colonnes')
    expect(markup).not.toContain('Aucun dossier')
    expect(markup).not.toContain('Table')
  })

  test('la sélection conserve les actions de la phase et le tableau', () => {
    const markup = renderToStaticMarkup(
      <BoardPhaseSection title="Clients partis" meta="50 dossiers" actions={<span>Colonnes</span>}>
        <p>Table</p>
      </BoardPhaseSection>
    )

    expect(markup).toContain('Colonnes')
    expect(markup).toContain('Table')
  })
})
