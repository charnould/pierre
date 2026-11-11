import { describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { CreatableChips, formatIsoDate } from './form-controls'

describe('CreatableChips', () => {
  test('affiche une valeur déjà enregistrée hors suggestions', () => {
    const html = renderToStaticMarkup(
      <CreatableChips
        ariaLabel="Aides mobilisables"
        placeholder="Saisir ou choisir une aide"
        empty="Aucune aide"
        suggestions={['FSL']}
        value={['Secours populaire']}
        onValueChange={() => {}}
      />
    )
    expect(html).toContain('Secours populaire')
    expect(html).not.toContain('Ajouter « Secours populaire »')
  })
})

describe('formatIsoDate', () => {
  test('affiche une date civile', () => {
    expect(formatIsoDate('2026-04-01')).toBe('01/04/2026')
    expect(formatIsoDate('')).toBe('')
  })
})
