const PHONE_COLUMNS = ['telephone_locataire', 'telephone', 'telephone_client'] as const
const EMAIL_COLUMNS = ['email_locataire', 'email', 'email_client'] as const
const ADDRESS_COLUMNS = ['adresse'] as const

export function contactColumnKind(column: string): 'email' | 'telephone' | 'address' | null {
  if ((EMAIL_COLUMNS as readonly string[]).includes(column)) return 'email'
  if ((PHONE_COLUMNS as readonly string[]).includes(column)) return 'telephone'
  if ((ADDRESS_COLUMNS as readonly string[]).includes(column)) return 'address'
  return null
}
