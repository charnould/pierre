import { describe, expect, test } from 'bun:test'

import { emptyCase, householdPeople, personChoices, UNASSIGNED_PERSON } from './document'

describe('householdPeople', () => {
  test('prend le prénom seul, le nom seul, ignore une ligne vide, adultes puis enfants', () => {
    const file = emptyCase()
    const adult = file.foyer.adultes[0]!
    file.foyer.adultes = [
      { ...adult, prenom: 'Ada', nom: null },
      { ...adult, prenom: null, nom: null }
    ]
    file.foyer.enfants = [
      { prenom: null, nom: 'Martin', date_naissance: null, a_charge: false },
      { prenom: '  ', nom: ' ', date_naissance: null, a_charge: false }
    ]
    expect(householdPeople(file.foyer)).toEqual([UNASSIGNED_PERSON, 'Ada', 'Martin'])
  })

  test('garde un nom qui n’est plus dans le foyer', () => {
    expect(personChoices([UNASSIGNED_PERSON, 'Ada'], 'Lina Martin')).toEqual([
      UNASSIGNED_PERSON,
      'Ada',
      'Lina Martin'
    ])
  })
})
