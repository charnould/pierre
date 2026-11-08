export type MailevaTarget = 'sandbox' | 'production'

const HOSTS: Record<MailevaTarget, { auth: string; api: string }> = {
  sandbox: {
    auth: 'https://connexion.sandbox.maileva.net/auth/realms/services/protocol/openid-connect',
    api: 'https://api.sandbox.maileva.net'
  },
  production: {
    auth: 'https://connexion.maileva.com/auth/realms/services/protocol/openid-connect',
    api: 'https://api.maileva.com'
  }
}

export const MAILEVA_PRODUCTS = {
  courrier: '/mail/v3',
  lrar: '/registered_mail/v4',
  lre: '/electronic-qualified-registered-mail/v1',
  ere: '/secured_electronic_mail/v1'
} as const

export type MailevaProduct = keyof typeof MAILEVA_PRODUCTS

export function mailevaHosts(target: MailevaTarget): { auth: string; api: string } {
  return HOSTS[target]
}

export function mailevaApi(target: MailevaTarget, path: string): string {
  return `${HOSTS[target].api}${path}`
}
