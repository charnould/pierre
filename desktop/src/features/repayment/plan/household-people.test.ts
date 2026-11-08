import { describe, expect, test } from 'bun:test'

import { blankChild, emptyRepaymentForms } from '../../../../../shared/repayment-plan'
import { FOYER, householdPeople, personChoices } from './document'

describe('householdPeople', () => {
  test('prend le prénom seul, le nom seul, ignore une ligne vide, adultes puis enfants', () => {
    const file = emptyRepaymentForms()
    const adult = file.donnees_communes.foyer.adultes[0]!
    file.donnees_communes.foyer.adultes = [
      { ...adult, prenom: 'Ada', nom: null },
      { ...adult, id_personne: 'personne_2', prenom: null, nom: null }
    ]
    file.donnees_communes.foyer.enfants = [
      { ...blankChild('personne_3'), nom: 'Martin' },
      { ...blankChild('personne_4'), prenom: '  ', nom: ' ' }
    ]
    expect(householdPeople(file.donnees_communes.foyer)).toEqual([
      { id: FOYER, label: 'Foyer' },
      { id: 'personne_1', label: 'Ada' },
      { id: 'personne_3', label: 'Martin' }
    ])
  })

  test('garde une personne qui n’est plus dans le foyer', () => {
    expect(
      personChoices(
        [
          { id: FOYER, label: 'Foyer' },
          { id: 'personne_1', label: 'Ada' }
        ],
        'personne_9'
      )
    ).toEqual([
      { id: FOYER, label: 'Foyer' },
      { id: 'personne_1', label: 'Ada' },
      { id: 'personne_9', label: 'personne_9' }
    ])
  })
})
