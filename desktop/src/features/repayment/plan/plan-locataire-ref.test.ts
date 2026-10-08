import { describe, expect, test } from 'bun:test'

import { emptyRepaymentForms } from '../../../../../shared/repayment-plan'
import { blankPlanEditorRequest } from '../lib/repayment-plan-editor-intent'
import { planLocataireRef } from './case-from-tenant'

describe('plan locataire reference', () => {
  test('prend l’identifiant saisi et ignore les blancs', () => {
    const forms = emptyRepaymentForms()
    forms.donnees_communes.identification.id_locataire = '  LOC-9  '
    expect(planLocataireRef(forms)).toBe('LOC-9')
  })

  test('est vide tant que l’identifiant n’est pas saisi', () => {
    expect(planLocataireRef(emptyRepaymentForms())).toBeNull()
  })

  test('un plan sans tableau part d’un dossier vide', () => {
    const request = blankPlanEditorRequest()
    expect(request.tenant.id_locataire).toBe('')
    expect(request.dossier).toEqual(emptyRepaymentForms())
    expect(request.dossier && planLocataireRef(request.dossier)).toBeNull()
  })
})
