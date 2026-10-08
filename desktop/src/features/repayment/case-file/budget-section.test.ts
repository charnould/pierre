import { describe, expect, test } from 'bun:test'

import { blankChild, emptyRepaymentCaseFile } from '@pierre/shared/repayment-case-file'

import { householdPersonOptions, personSelectOptions } from './budget-section'

describe('householdPersonOptions', () => {
  test('prend le prénom seul, le nom seul, ignore une ligne vide, adultes puis enfants', () => {
    const caseFile = emptyRepaymentCaseFile()
    const adult = caseFile.donnees_communes.foyer.adultes[0]!
    caseFile.donnees_communes.foyer.adultes = [
      { ...adult, prenom: 'Ada', nom: null },
      { ...adult, id_personne: 'personne_2', prenom: null, nom: null }
    ]
    caseFile.donnees_communes.foyer.enfants = [
      { ...blankChild('personne_3'), nom: 'Martin' },
      { ...blankChild('personne_4'), prenom: '  ', nom: ' ' }
    ]
    expect(householdPersonOptions(caseFile.donnees_communes.foyer)).toEqual([
      { id: 'foyer', label: 'Foyer' },
      { id: 'personne_1', label: 'Ada' },
      { id: 'personne_3', label: 'Martin' }
    ])
  })

  test('garde une personne qui n’est plus dans le foyer', () => {
    expect(
      personSelectOptions(
        [
          { id: 'foyer', label: 'Foyer' },
          { id: 'personne_1', label: 'Ada' }
        ],
        'personne_9'
      )
    ).toEqual([
      { id: 'foyer', label: 'Foyer' },
      { id: 'personne_1', label: 'Ada' },
      { id: 'personne_9', label: 'personne_9' }
    ])
  })
})
