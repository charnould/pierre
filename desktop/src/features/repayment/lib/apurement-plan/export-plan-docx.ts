import planTemplateUrl from '@customization/repayments/templates/template.docx?url'

import { renderDocxTemplate } from '@/features/workflow/lib/generate-docx'

import { buildPlanDocxData, resolveLeaseHolders } from './build-plan-docx-data'
import { PLAN_TYPE_LABELS, type ApurementPlanFormData } from './types'

export function generatePlanDocxFilename(
  form: ApurementPlanFormData,
  idClient: string,
  now: Date = new Date()
): string {
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const caf =
    resolveLeaseHolders(form.household.adults)
      .map((adult) => adult.cafNumber.trim())
      .find(Boolean) ?? ''
  const client = idClient.trim()
  const ref = client && caf ? `${client}/${caf}` : client || caf || 'sans-ref'
  return `${yyyy}-${mm}-${dd} - ${ref} - ${PLAN_TYPE_LABELS[form.planType]}`
}

export type ExportPlanDocxContext = {
  id_locataire: string
  id_client: string
  email?: string
}

/** Prefers form ids; falls back to the dossier tenant context. */
export function resolvePlanExportIds(
  form: Pick<ApurementPlanFormData, 'idLocataire' | 'idClient'>,
  ctx: Pick<ExportPlanDocxContext, 'id_locataire' | 'id_client'>
): { id_locataire: string; id_client: string } {
  return {
    id_locataire: form.idLocataire.trim() || ctx.id_locataire,
    id_client: form.idClient.trim() || ctx.id_client
  }
}

export async function exportApurementPlanDocx(
  form: ApurementPlanFormData,
  ctx: ExportPlanDocxContext
): Promise<boolean> {
  const resp = await fetch(planTemplateUrl)
  if (!resp.ok) {
    console.error(`[export] Failed to load plan template (${resp.status})`)
    return false
  }
  const buffer = await resp.arrayBuffer()

  let email = ctx.email?.trim() ?? ''
  if (!email) {
    const settings = await window.api?.getSettings?.()
    email = settings?.email?.trim() ?? ''
  }

  const ids = resolvePlanExportIds(form, ctx)
  const data = buildPlanDocxData(form, {
    ...ids,
    email
  })
  const bytes = await renderDocxTemplate(buffer, data)
  const blob = new Blob([new Uint8Array(bytes)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${generatePlanDocxFilename(form, ids.id_client)}.docx`
  a.click()
  URL.revokeObjectURL(a.href)
  return true
}
