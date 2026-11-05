import type { RcsChoice } from '../../../../../shared/rcs-message'
import type {
  RepaymentEmailMessage,
  RepaymentRcsMessage
} from '../../../../../shared/repayment-messages'
import type { TenantRepaymentRow } from './classify-tenants'

const PLACEHOLDER_KEYS = ['id_locataire', 'id_client', 'email_client', 'telephone_client'] as const

type PlaceholderKey = (typeof PLACEHOLDER_KEYS)[number]

export type ResolvedRepaymentEmail = {
  action: string
  to: RepaymentEmailMessage['to']
  toAddress: string
  subject: string
  body: string
  mailtoUrl: string
}

export type ResolvedRepaymentRcs = {
  action: string
  body: string
  sms_fallback: string
  choices: RcsChoice[]
}

function tenantField(tenant: TenantRepaymentRow, key: PlaceholderKey): string {
  const value = tenant[key]
  if (value == null) return ''
  return String(value).trim()
}

function applyPlaceholders(text: string, tenant: TenantRepaymentRow): string {
  return text.replace(/\{\{(\w+)\}\}/g, (full, key: string) => {
    if ((PLACEHOLDER_KEYS as readonly string[]).includes(key)) {
      return tenantField(tenant, key as PlaceholderKey)
    }
    return full
  })
}

function resolveChoice(choice: RcsChoice, tenant: TenantRepaymentRow): RcsChoice {
  if (choice.type === 'reply')
    return { type: 'reply', label: applyPlaceholders(choice.label, tenant) }
  if (choice.type === 'dial') {
    return {
      type: 'dial',
      label: applyPlaceholders(choice.label, tenant),
      phone: applyPlaceholders(choice.phone, tenant)
    }
  }
  return {
    type: 'url',
    label: applyPlaceholders(choice.label, tenant),
    url: applyPlaceholders(choice.url, tenant)
  }
}

export function resolveRepaymentEmail(
  message: RepaymentEmailMessage,
  tenant: TenantRepaymentRow
): ResolvedRepaymentEmail {
  const subject = applyPlaceholders(message.subject, tenant)
  const body = applyPlaceholders(message.body, tenant)
  const toAddress =
    message.to === 'caf' ? (message.email ?? '') : tenantField(tenant, 'email_client')
  const safeTo = toAddress.replace(/[<>"]/g, '')
  const params: string[] = []
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`)
  if (body) params.push(`body=${encodeURIComponent(body)}`)
  return {
    action: message.action,
    to: message.to,
    toAddress: safeTo,
    subject,
    body,
    mailtoUrl: `mailto:${safeTo}${params.length > 0 ? `?${params.join('&')}` : ''}`
  }
}

export function resolveRepaymentRcs(
  message: RepaymentRcsMessage,
  tenant: TenantRepaymentRow
): ResolvedRepaymentRcs {
  return {
    action: message.action,
    body: applyPlaceholders(message.body, tenant),
    sms_fallback: applyPlaceholders(message.sms_fallback, tenant),
    choices: message.choices.map((choice) => resolveChoice(choice, tenant))
  }
}
