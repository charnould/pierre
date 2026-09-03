import type { LoginErrorCode } from '../../../src/shared/lib/login-errors'

export function loginFailureFromStatus(status: number): LoginErrorCode {
  if (status === 401) return 'invalid_credentials'
  if (status === 429) return 'rate_limited'
  return 'server_error'
}

export function principalFailureFromStatus(status: number): LoginErrorCode {
  return status === 401 ? 'session_expired' : 'server_error'
}

export function authRequestHeaders(baseUrl: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Origin: new URL(baseUrl).origin
  }
}

export function isPierreAuthCookie(name: string): boolean {
  return (
    name.startsWith('pierre.') ||
    name.startsWith('__Secure-pierre.') ||
    name.startsWith('__Host-pierre.')
  )
}
