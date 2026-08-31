import { buildApurementPlanOutput } from './apurement-plan/defaults'
import { PLAN_TYPE_LABELS, type ApurementPlanFormData } from './apurement-plan/types'

export function resolvePlanPersistMode(existingActivityId?: number): 'create' | 'patch' {
  return existingActivityId ? 'patch' : 'create'
}

export function shouldApplyPlanAdvancement(
  existingActivityId: number | undefined,
  initialSigned: boolean | null,
  signed: boolean
): boolean {
  return existingActivityId == null || initialSigned == null || signed !== initialSigned
}

export function resolvePlanComment(nextComment: string | undefined, savedComment: string): string {
  return nextComment !== undefined ? nextComment.trim() : savedComment
}

export function buildPlanContenu(
  form: ApurementPlanFormData,
  tenantId: string,
  note: string
): string {
  const proposal = buildApurementPlanOutput(tenantId, form)
  return JSON.stringify({
    version: 1,
    titre: PLAN_TYPE_LABELS[form.planType],
    etat: form.signed ? 'signe' : 'brouillon',
    resume: {
      mensualite: proposal.summary.monthlyAmount,
      nombre_echeances: proposal.summary.durationMonths,
      montant_total: proposal.summary.totalDebt
    },
    ...(note ? { note } : {}),
    formulaire: proposal.form,
    calculs: proposal.calculations
  })
}
