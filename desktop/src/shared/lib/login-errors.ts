export type LoginErrorCode =
  | 'wrong_password'
  | 'wrong_root_password'
  | 'unknown_user'
  | 'network_error'
  | 'invalid_response'
  | 'session_cookie_missing'
  | 'server_error'
  | 'api_unavailable'

export type LoginResult = { ok: true } | { ok: false; message?: LoginErrorCode | string }

export type LoginField = 'url' | 'email' | 'password'
export type LoginFieldErrors = Partial<Record<LoginField, string>>

export const LOGIN_REQUIRED_LABEL = 'Champ obligatoire.'
export const LOGIN_INVALID_URL_LABEL = 'URL invalide. Exemple : http://localhost:3000'

function isAuthCredentialError(message?: string): boolean {
  return (
    message === 'wrong_password' || message === 'wrong_root_password' || message === 'unknown_user'
  )
}

export type ConnectionErrorKind = 'validation' | 'auth' | 'server' | null

export function loginErrorKind(message?: string): ConnectionErrorKind {
  if (!message) return 'server'
  if (isAuthCredentialError(message)) return 'auth'
  return 'server'
}

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
  if (!input.password.trim()) errors.password = LOGIN_REQUIRED_LABEL
  return errors
}

export function loginFieldErrorsFromCode(code?: LoginErrorCode | string): LoginFieldErrors {
  const label = loginErrorLabel(code)
  if (code === 'unknown_user') return { email: label }
  if (code === 'wrong_password' || code === 'wrong_root_password') return { password: label }
  if (!code) return { password: label }
  return { url: label }
}

export function loginErrorLabel(message?: string): string {
  switch (message) {
    case 'wrong_root_password':
      return 'Mot de passe incorrect.'
    case 'unknown_user':
      return 'Utilisateur inconnu sur ce serveur.'
    case 'wrong_password':
      return 'Mot de passe incorrect.'
    case 'network_error':
      return 'Impossible de joindre ce serveur.'
    case 'invalid_response':
      return 'Impossible de joindre ce serveur.'
    case 'session_cookie_missing':
      return 'Connexion refusée par le client (cookie de session). Vérifiez l’URL du serveur.'
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
