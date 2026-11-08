import type { RcsChoice } from './rcs-message'

export type RepaymentRcsMessage = {
  kind: 'rcs'
  group: string
  action: string
  label: string
  body: string
  sms_fallback: string
  choices: RcsChoice[]
}

export type RepaymentEmailMessage = {
  kind: 'email'
  to: 'locataire' | 'caf'
  group: string
  action: string
  label: string
  subject: string
  body: string
  email: string | null
}

export type RepaymentMessage = RepaymentRcsMessage | RepaymentEmailMessage

export function repaymentMessageKey(message: Pick<RepaymentMessage, 'group' | 'label'>): string {
  return `${message.group}\u0000${message.label}`
}
