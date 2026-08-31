import { describe, expect, test } from 'bun:test'

import {
  bindMatchingPlaceholders,
  filterSlashFields,
  getSlashFieldTrigger,
  insertSlashField
} from './bulk-template-command'

describe('commande slash des modèles Bulk', () => {
  test('s’ouvre uniquement en début de ligne ou après un espace', () => {
    expect(getSlashFieldTrigger('/', 1)).toEqual({ start: 0, query: '' })
    expect(getSlashFieldTrigger('Bonjour /nom', 12)).toEqual({ start: 8, query: 'nom' })
    expect(getSlashFieldTrigger('https://pierre.test', 8)).toBeNull()
    expect(getSlashFieldTrigger('mot/nom', 7)).toBeNull()
  })

  test('remplace la commande par le placeholder stocké', () => {
    expect(
      insertSlashField('Bonjour /nom', { start: 8, query: 'nom' }, 'nom_locataire', 12)
    ).toEqual({
      value: 'Bonjour {{nom_locataire}} ',
      caret: 26
    })
  })

  test('filtre les champs et lie automatiquement le placeholder sélectionné', () => {
    const fields = [
      { value: 'nom_locataire', label: 'nom_locataire' },
      { value: 'solde_locataire', label: 'solde_locataire' }
    ]
    expect(filterSlashFields(fields, 'nom')).toEqual([fields[0]])
    expect(bindMatchingPlaceholders(['nom_locataire', 'civilite'], {}, fields)).toEqual({
      nom_locataire: 'nom_locataire',
      civilite: ''
    })
  })
})
