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

export function isAuthCredentialError(message?: string): boolean {
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

export function connectionFieldInvalid(
  field: 'url' | 'email' | 'password',
  error: string,
  errorKind: ConnectionErrorKind
): boolean {
  if (!error || !errorKind) return false
  if (errorKind === 'validation') {
    if (error.startsWith('URL invalide')) return field === 'url'
    if (error.startsWith('Tous les champs')) return true
  }
  if (errorKind === 'auth') return field === 'password'
  return false
}

export function loginErrorLabel(message?: string): string {
  switch (message) {
    case 'wrong_root_password':
      return 'Mot de passe administrateur incorrect (AUTH_PASSWORD du serveur).'
    case 'unknown_user':
      return 'Email inconnu sur ce serveur.'
    case 'wrong_password':
      return 'Mot de passe incorrect.'
    case 'network_error':
      return 'Impossible de joindre le serveur. Vérifiez que Pierre tourne sur cette URL.'
    case 'invalid_response':
      return 'Réponse serveur inattendue. Vérifiez la version de Pierre.'
    case 'session_cookie_missing':
      return 'Connexion refusée par le client (cookie de session). Vérifiez l’URL du serveur.'
    case 'server_error':
      return 'Erreur serveur lors de la connexion. Réessayez plus tard.'
    case 'api_unavailable':
      return 'API desktop indisponible. Relancez l’application Electron (bun run dev).'
    default:
      if (message) {
        return `Erreur de connexion (${message}).`
      }
      return 'Identifiant ou mot de passe incorrect.'
  }
}
