import { describe, expect, test } from 'bun:test'

import { emptyRepaymentCaseFile } from '@pierre/shared/repayment-case-file'

import { blankCaseFileEditorRequest } from '../lib/case-file-editor-intent'
import { normalizeCaseFile } from './normalize-case-file'
import { tenantFromCaseFile } from './tenant-case-file'

describe('tenant case file', () => {
  test('prend l’identifiant saisi et ignore les blancs', () => {
    const caseFile = emptyRepaymentCaseFile()
    caseFile.donnees_communes.identification.id_locataire = '  LOC-9  '
    expect(tenantFromCaseFile(normalizeCaseFile(caseFile)).id_locataire).toBe('LOC-9')
  })

  test('est vide tant que l’identifiant n’est pas saisi', () => {
    expect(tenantFromCaseFile(normalizeCaseFile(emptyRepaymentCaseFile())).id_locataire).toBe('')
  })

  test('un dossier sans tableau part d’un dossier vide', () => {
    const request = blankCaseFileEditorRequest()
    expect(request.tenant.id_locataire).toBe('')
    expect(request.caseFile).toEqual(emptyRepaymentCaseFile())
    expect(request.caseFile && tenantFromCaseFile(request.caseFile).id_locataire).toBe('')
  })
})
