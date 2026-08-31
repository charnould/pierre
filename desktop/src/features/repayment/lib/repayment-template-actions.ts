import { findOutboundTemplateById } from './outbound-email-templates'
import { listOutboundTemplates } from './outbound-email-templates.bundle'
import type { RepaymentActionId } from './repayment-action'

/** Libellé de l'action portée par l'envoi, ou null si le modèle est inconnu. */
export function actionForTemplate(templateId: string): RepaymentActionId | null {
  return findOutboundTemplateById(listOutboundTemplates(), templateId)?.action ?? null
}
