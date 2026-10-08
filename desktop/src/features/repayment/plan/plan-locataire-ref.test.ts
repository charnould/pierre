import { describe, expect, test } from 'bun:test'

import { blankPlanEditorRequest } from '../lib/repayment-plan-editor-intent'
import { planLocataireRef } from './case-from-tenant'
import { emptyCase } from './document'

describe('plan locataire reference', () => {
  test('prend l’identifiant saisi et ignore les blancs', () => {
    const dossier = emptyCase()
    dossier.identification.identifiant_locataire = '  LOC-9  '
    expect(planLocataireRef(dossier)).toBe('LOC-9')
  })

  test('est vide tant que l’identifiant n’est pas saisi', () => {
    expect(planLocataireRef(emptyCase())).toBeNull()
  })

  test('un plan sans tableau part d’un dossier vide', () => {
    const request = blankPlanEditorRequest()
    expect(request.tenant.id_locataire).toBe('')
    expect(request.dossier).toEqual(emptyCase())
    expect(request.dossier && planLocataireRef(request.dossier)).toBeNull()
  })
})
