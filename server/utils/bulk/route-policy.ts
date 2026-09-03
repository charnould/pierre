import type {
  BulkMedium,
  PreviewRow,
  PreviewStepReason,
  SimpleDeliveryStep,
  SkippedDeliveryStep
} from '../../../shared/bulk-operations'
import { normalize_email } from '../contacts'
import { step_placeholders, validate_bindings } from './placeholders'

export const contact_issues = (medium: BulkMedium, row: PreviewRow): PreviewStepReason[] => {
  if (medium === 'rcs' || medium === 'sms') {
    if (!row.telephone) return [{ code: 'missing_destination' }]
    const status = row.values['telephone_status']
    if (status == null || status === '') return [{ code: 'unverified_contact' }]
    if (status === 'invalid') return [{ code: 'invalid_contact' }]
    const compatible =
      medium === 'rcs'
        ? status === 'rcs_compatible'
        : status === 'sms_compatible' || status === 'rcs_compatible'
    return compatible ? [] : [{ code: 'incompatible_contact', status: String(status) }]
  }
  if (medium === 'email' || medium === 'lre') {
    if (!row.email) return [{ code: 'missing_destination' }]
    if (normalize_email(row.email).status === 'invalid') return [{ code: 'invalid_contact' }]
    const status = row.values['email_status']
    if (status == null || status === '') return [{ code: 'unverified_contact' }]
    return status === 'ok' || status === 'soft_bounce' ? [] : [{ code: 'invalid_contact' }]
  }
  return row.adresse ? [] : [{ code: 'missing_destination' }]
}

const fallback_step_issues = (step: SimpleDeliveryStep, row: PreviewRow): PreviewStepReason[] => {
  const reasons = contact_issues(step.medium, row)
  if ((step.medium === 'rcs' || step.medium === 'sms') && step.body.trim() === '') {
    reasons.push({ code: 'missing_content' })
  } else if (
    (step.medium === 'email' || step.medium === 'lre') &&
    (step.subject.trim() === '' || step.body.trim() === '')
  ) {
    reasons.push({ code: 'missing_content' })
  } else if (
    (step.medium === 'courrier' || step.medium === 'lrar') &&
    (!step.filename || !step.fileBase64)
  ) {
    reasons.push({ code: 'missing_file' })
  }
  try {
    validate_bindings(
      step_placeholders(step),
      step.placeholderBindings,
      new Set(Object.keys(row.values))
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const placeholders = [
      ...step_placeholders(step),
      ...Object.keys(step.placeholderBindings)
    ].filter(
      (key, index, all) =>
        all.indexOf(key) === index &&
        (!(key in step.placeholderBindings) ||
          !(
            step.placeholderBindings[key] === 'date_du_jour' ||
            step.placeholderBindings[key]! in row.values
          ))
    )
    reasons.push({
      code: 'missing_placeholders',
      placeholders: placeholders.length ? placeholders.sort() : [message]
    })
  }
  return reasons
}

export const select_fallback_route = (
  row: PreviewRow,
  steps: readonly SimpleDeliveryStep[],
  startIndex = 0
): {
  route: { kind: 'fallback'; medium: BulkMedium; stepIndex: number } | null
  skippedSteps: SkippedDeliveryStep[]
} => {
  const skippedSteps: SkippedDeliveryStep[] = []
  for (let stepIndex = startIndex; stepIndex < steps.length; stepIndex += 1) {
    const step = steps[stepIndex]!
    const reasons = fallback_step_issues(step, row)
    if (reasons.length === 0) {
      return {
        route: { kind: 'fallback', medium: step.medium, stepIndex },
        skippedSteps
      }
    }
    skippedSteps.push({ medium: step.medium, stepIndex, reasons })
  }
  return { route: null, skippedSteps }
}
