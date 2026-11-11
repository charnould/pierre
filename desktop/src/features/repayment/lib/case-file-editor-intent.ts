import { emptyRepaymentCaseFile, type RepaymentCaseFile } from '@pierre/shared/repayment-case-file'

import type { ChronologyEntry } from './case-file-chronology'
import type { TenantRepaymentRow } from './classify-tenants'

export type CaseFileEditorRequest = {
  tenant: TenantRepaymentRow
  activityId?: number
  caseFile?: RepaymentCaseFile
  chronology?: ChronologyEntry[]
}

type Listener = (request: CaseFileEditorRequest) => void

const listeners = new Set<Listener>()

export function subscribeCaseFileEditor(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Case file with nothing prefilled from the ledger. */
export function blankCaseFileEditorRequest(): CaseFileEditorRequest {
  return {
    tenant: { id_locataire: '', id_client: '', solde_locataire: 0 },
    caseFile: emptyRepaymentCaseFile()
  }
}

export function requestCaseFileEditor(request: CaseFileEditorRequest): void {
  for (const listener of listeners) listener(request)
}
