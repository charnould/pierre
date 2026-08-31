import type { VariantProps } from 'class-variance-authority'

import type { badgeVariants } from '@/shared/components/ui/badge'

type EmailStatus = 'invalid' | 'ok' | 'soft_bounce' | 'hard_bounce'
type TelephoneStatus = 'invalid' | 'sms_compatible' | 'rcs_compatible'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

export type ContactStatusBadge = {
  label: string
  variant: BadgeVariant
}

const EMAIL_STATUS: Record<EmailStatus, ContactStatusBadge> = {
  ok: { label: 'OK', variant: 'secondary' },
  invalid: { label: 'Invalide', variant: 'destructive' },
  soft_bounce: { label: 'Soft bounce', variant: 'destructive' },
  hard_bounce: { label: 'Hard bounce', variant: 'destructive' }
}

const TELEPHONE_STATUS: Record<TelephoneStatus, ContactStatusBadge> = {
  sms_compatible: { label: 'SMS', variant: 'secondary' },
  rcs_compatible: { label: 'RCS', variant: 'secondary' },
  invalid: { label: 'Invalide', variant: 'destructive' }
}

function asNonEmptyString(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s === '' ? null : s
}

/** Badge for a registry status. Null when there is no value, or no known status. */
export function resolveContactStatusBadge(
  value: unknown,
  status: unknown,
  kind: 'email' | 'telephone'
): ContactStatusBadge | null {
  if (asNonEmptyString(value) == null) return null
  const key = asNonEmptyString(status)
  if (key == null) return null
  const map = kind === 'email' ? EMAIL_STATUS : TELEPHONE_STATUS
  return (map as Record<string, ContactStatusBadge>)[key] ?? null
}

export function formatContactValue(value: unknown): string {
  return asNonEmptyString(value) ?? 'Non renseigné'
}

export function hasContactValue(value: unknown): boolean {
  return asNonEmptyString(value) != null
}
