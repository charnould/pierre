import { describe, expect, it } from 'bun:test'

import { parseResult } from '../../../desktop/src/lib/parse-result'

describe('parseResult', () => {
  it('extrait artifact analysis et response', () => {
    const input = `<artifact name="analysis">
Demande de RDV, ton neutre.
</artifact>
<artifact name="response">
Madame, Monsieur, nous avons bien reçu votre message.
</artifact>`

    const result = parseResult(input)
    expect(result.analysis).toBe('Demande de RDV, ton neutre.')
    expect(result.response).toBe('Madame, Monsieur, nous avons bien reçu votre message.')
  })

  it('trimme les espaces autour du contenu artifact', () => {
    const input = `<artifact name="analysis">
  analyse ici
</artifact><artifact name="response">  réponse ici  </artifact>`
    const result = parseResult(input)
    expect(result.analysis).toBe('analyse ici')
    expect(result.response).toBe('réponse ici')
  })

  it('retourne response vide si seul analysis est présent', () => {
    const input = '<artifact name="analysis">Interne</artifact>'
    const result = parseResult(input)
    expect(result.analysis).toBe('Interne')
    expect(result.response).toBe('')
  })

  it('retourne les deux vides si aucun artifact', () => {
    const result = parseResult('Texte sans balise')
    expect(result.response).toBe('')
    expect(result.analysis).toBe('')
  })

  it('préserve le markdown dans le bloc analysis', () => {
    const analyse = '**Cas 3** — Recouvrement\n\n- dette locative\n- ton empathique'
    const input = `<artifact name="analysis">\n${analyse}\n</artifact><artifact name="response">Bonjour.</artifact>`
    const result = parseResult(input)
    expect(result.analysis).toBe(analyse)
  })

  it('gère un contenu multi-lignes dans les deux blocs', () => {
    const analyse = 'Ligne 1\nLigne 2\nLigne 3'
    const reponse = 'Cher Monsieur,\n\nCordialement.'
    const input = `<artifact name="analysis">${analyse}</artifact><artifact name="response">${reponse}</artifact>`
    const result = parseResult(input)
    expect(result.analysis).toBe(analyse)
    expect(result.response).toBe(reponse)
  })

  it("retourne les deux chaînes vides si l'input est vide", () => {
    const result = parseResult('')
    expect(result.analysis).toBe('')
    expect(result.response).toBe('')
  })
})
