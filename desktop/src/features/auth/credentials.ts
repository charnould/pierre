import type { LoginResult } from '@/shared/lib/login-errors'
import type { Settings } from '@/shared/types'

/** Logs in via main-process IPC using stored credentials. */
export async function loginWithStoredCredentials({
  url,
  email,
  password
}: Settings): Promise<LoginResult> {
  if (!url || !email || !password) return { ok: false, message: 'server_error' }
  if (!window.api?.login) return { ok: false, message: 'api_unavailable' }
  return window.api.login({ url, email, password })
}
