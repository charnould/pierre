import { ipcMain, session, type Session } from 'electron'

import type { LoginResult } from '../../../src/shared/lib/login-errors'
import type { UserPrincipal } from '../../../src/shared/types/users'
import { netFetch } from '../../lib/net-fetch'
import { logMainError } from '../../services/logging'
import type { SettingsStore } from '../../services/settings-store'
import { IpcChannel } from '../channels'
import {
  authRequestHeaders,
  isPierreAuthCookie,
  loginFailureFromStatus,
  principalFailureFromStatus
} from './login-result'

async function readPrincipal(ses: Session, baseUrl: string): Promise<LoginResult> {
  try {
    const response = await netFetch(`${baseUrl}/desktop/me`, { session: ses })
    if (!response.ok) return { ok: false, message: principalFailureFromStatus(response.status) }
    const body = (await response.json()) as { user?: UserPrincipal }
    return body.user ? { ok: true, user: body.user } : { ok: false, message: 'invalid_response' }
  } catch (error) {
    logMainError('auth.principal', error)
    return { ok: false, message: 'network_error' }
  }
}

async function signIn(
  ses: Session,
  baseUrl: string,
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    const response = await netFetch(`${baseUrl}/auth/sign-in/email`, {
      method: 'POST',
      session: ses,
      headers: authRequestHeaders(baseUrl),
      body: JSON.stringify({ email, password })
    })
    if (!response.ok) return { ok: false, message: loginFailureFromStatus(response.status) }
    return readPrincipal(ses, baseUrl)
  } catch (error) {
    logMainError('auth.sign-in', error)
    return { ok: false, message: 'network_error' }
  }
}

async function signOut(ses: Session, baseUrl: string): Promise<void> {
  try {
    await netFetch(`${baseUrl}/auth/sign-out`, {
      method: 'POST',
      session: ses,
      headers: authRequestHeaders(baseUrl)
    })
  } catch (error) {
    logMainError('auth.sign-out', error)
  } finally {
    const cookies = await ses.cookies.get({ url: baseUrl })
    await Promise.all(
      cookies
        .filter(({ name }) => isPierreAuthCookie(name))
        .map(({ name }) => ses.cookies.remove(baseUrl, name))
    )
  }
}

export function registerAuthHandlers(partition: string, store: SettingsStore): void {
  ipcMain.handle(IpcChannel.auth.login, async (_, { url, email, password }) => {
    const ses = session.fromPartition(partition)
    await signOut(ses, url)
    return signIn(ses, url, email, password)
  })

  ipcMain.handle(IpcChannel.auth.restoreSession, async () => {
    const saved = store.readSettings()
    const url = typeof saved?.url === 'string' ? saved.url : ''
    if (!url) return { ok: false, message: 'session_expired' }
    return readPrincipal(session.fromPartition(partition), url)
  })

  ipcMain.handle(IpcChannel.auth.logout, async () => {
    const saved = store.readSettings()
    if (typeof saved?.url === 'string') {
      await signOut(session.fromPartition(partition), saved.url)
    }
    return true
  })

  ipcMain.handle(IpcChannel.auth.getChatBoot, async (_, { url, config }) => {
    const params = new URLSearchParams()
    if (config) params.set('config', config)
    const qs = params.toString()
    try {
      const response = await netFetch(`${url}/ai/boot${qs ? `?${qs}` : ''}`, {
        session: session.fromPartition(partition)
      })
      if (!response.ok) return null
      return await response.json()
    } catch (error) {
      logMainError('get-chat-boot', error)
      return null
    }
  })
}
