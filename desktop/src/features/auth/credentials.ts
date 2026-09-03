import type { LoginResult } from '@/shared/lib/login-errors'

/** Logs in via main-process IPC using credentials the renderer already holds. */
export async function loginWithTypedCredentials({
  url,
  email,
  password
}: {
  url?: string
  email?: string
  password?: string
}): Promise<LoginResult> {
  if (!url || !email || !password) return { ok: false, message: 'server_error' }
  if (!window.api?.login) return { ok: false, message: 'api_unavailable' }
  return window.api.login({ url, email, password })
}

export async function restoreSession(): Promise<LoginResult> {
  if (!window.api?.restoreSession) return { ok: false, message: 'api_unavailable' }
  return window.api.restoreSession()
}
