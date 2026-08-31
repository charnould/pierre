import type { LoginResult } from '@/shared/lib/login-errors'
import type { Settings } from '@/shared/types'

/** Logs in via main-process IPC using credentials the renderer already holds. */
export async function loginWithTypedCredentials({
  url,
  email,
  password
}: Settings): Promise<LoginResult> {
  if (!url || !email || !password) return { ok: false, message: 'server_error' }
  if (!window.api?.login) return { ok: false, message: 'api_unavailable' }
  return window.api.login({ url, email, password })
}

/** Logs in via main-process IPC using the encrypted store — password never enters the renderer. */
export async function loginWithStoredCredentials(): Promise<LoginResult> {
  if (!window.api?.loginStored) return { ok: false, message: 'api_unavailable' }
  return window.api.loginStored()
}
