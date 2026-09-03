import type { UserPrincipal } from '@/shared/types/users'

export type LoginErrorCode =
  | 'invalid_credentials'
  | 'rate_limited'
  | 'session_expired'
  | 'network_error'
  | 'invalid_response'
  | 'server_error'
  | 'api_unavailable'

export type LoginResult =
  | { ok: true; user: UserPrincipal }
  | { ok: false; message?: LoginErrorCode | string }

export type LoginField = 'url' | 'email' | 'password'
export type LoginFieldErrors = Partial<Record<LoginField, string>>

export const LOGIN_REQUIRED_LABEL = 'Champ obligatoire.'
export const LOGIN_INVALID_URL_LABEL = 'URL invalide. Exemple : http://localhost:3000'

export function connectionFieldInvalid(field: LoginField, errors: LoginFieldErrors): boolean {
  return Boolean(errors[field])
}

export function validateLoginFields(input: {
  url: string
  email: string
  password: string
}): LoginFieldErrors {
  const errors: LoginFieldErrors = {}
  const url = input.url.trim()
  if (!url) {
    errors.url = LOGIN_REQUIRED_LABEL
  } else {
    try {
      void new URL(url).origin
    } catch {
      errors.url = LOGIN_INVALID_URL_LABEL
    }
  }
  if (!input.email.trim()) errors.email = LOGIN_REQUIRED_LABEL
  if (!input.password) errors.password = LOGIN_REQUIRED_LABEL
  return errors
}

export function loginFieldErrorsFromCode(code?: LoginErrorCode | string): LoginFieldErrors {
  const label = loginErrorLabel(code)
  if (code === 'invalid_credentials' || code === 'rate_limited') return { password: label }
  if (!code) return { password: label }
  return { url: label }
}

export function loginErrorLabel(message?: string): string {
  switch (message) {
    case 'invalid_credentials':
      return 'Email ou mot de passe incorrect.'
    case 'rate_limited':
      return 'Trop de tentatives. Réessayez dans quelques instants.'
    case 'session_expired':
      return 'Votre session a expiré. Reconnectez-vous.'
    case 'network_error':
      return 'Impossible de joindre ce serveur.'
    case 'invalid_response':
      return 'Impossible de joindre ce serveur.'
    case 'server_error':
      return 'Impossible de joindre ce serveur.'
    case 'api_unavailable':
      return 'Impossible de joindre ce serveur.'
    default:
      if (message) {
        return `Erreur de connexion (${message}).`
      }
      return 'Identifiant ou mot de passe incorrect.'
  }
}
