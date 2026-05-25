import { ipcMain, net, session, type Session } from 'electron'

import { pierreCookieLinesFromWebHeaders } from '../../../src/features/auth/login'
import type { LoginErrorCode } from '../../../src/shared/lib/login-errors'
import { logMainError, logMainInfo } from '../../services/logging'
import type { SettingsStore } from '../../services/settings-store'
import { IpcChannel } from '../channels'
import { ensurePierreAuthCookie } from './auth-cookie'
import { patchAuthSetCookieHeaders } from './cookie-patcher'

const LOGIN_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  Accept: 'application/json',
  'X-Pierre-Client': 'desktop'
} as const

/**
 * Removes all cookies from the persistent Pierre session partition.
 */
export async function clearSessionCookies(ses: Session): Promise<void> {
  const cookies = await ses.cookies.get({})
  for (const cookie of cookies) {
    const domain = cookie.domain?.startsWith('.') ? cookie.domain.slice(1) : cookie.domain
    if (!domain) continue
    const path = cookie.path ?? '/'
    const proto = cookie.secure ? 'https' : 'http'
    const removeUrl = `${proto}://${domain}${path}`
    await ses.cookies.remove(removeUrl, cookie.name).catch((error) => {
      logMainError('clear-session-cookie', error)
    })
  }
}

let cookieInterceptorInstalled = false

/**
 * Installs the auth cookie webRequest hook once per app lifecycle.
 */
export function installAuthCookieInterceptor(partition: string): void {
  if (cookieInterceptorInstalled) return
  cookieInterceptorInstalled = true

  const ses = session.fromPartition(partition)
  ses.webRequest.onHeadersReceived((details, callback) => {
    const headers = details.responseHeaders ?? {}
    const cookieLines = pierreCookieLinesFromWebHeaders(headers)
    if (cookieLines.some((c) => c.startsWith('pierre-ia='))) {
      patchAuthSetCookieHeaders(headers, { secure: details.url.startsWith('https:') })
    }
    callback({ responseHeaders: headers })
  })
}

async function postLoginForm(
  ses: Session,
  baseUrl: string,
  params: URLSearchParams
): Promise<{ ok: boolean; message?: LoginErrorCode | string }> {
  const loginUrl = `${baseUrl}/a/login?client=desktop`
  let resp: Response
  try {
    resp = await net.fetch(loginUrl, {
      method: 'POST',
      headers: LOGIN_HEADERS,
      body: params,
      session: ses
    })
  } catch (error) {
    logMainError('post-login-form.fetch', error)
    logMainInfo('post-login-form', `url=${loginUrl} fetch failed`)
    return { ok: false, message: 'network_error' }
  }

  let data: { ok?: boolean; message?: string }
  try {
    data = (await resp.json()) as { ok?: boolean; message?: string }
  } catch (error) {
    logMainError('post-login-form.parse', error)
    logMainInfo('post-login-form', `url=${loginUrl} status=${resp.status} body=non-json`)
    return { ok: false, message: 'invalid_response' }
  }

  logMainInfo(
    'post-login-form',
    `url=${loginUrl} status=${resp.status} jsonOk=${String(data.ok)} message=${data.message ?? '-'}`
  )

  if (!resp.ok) {
    return { ok: false, message: data.message ?? 'server_error' }
  }

  if (data.ok !== true) {
    return { ok: false, message: data.message ?? 'server_error' }
  }

  const cookieStored = await ensurePierreAuthCookie(ses, baseUrl, resp)
  logMainInfo('post-login-form', `cookiePresent=${cookieStored}`)

  if (!cookieStored) {
    return { ok: false, message: 'session_cookie_missing' }
  }

  return { ok: true }
}

/**
 * Registers login, logout, chat boot, and skills IPC handlers.
 */
export function registerAuthHandlers(partition: string, store: SettingsStore): void {
  ipcMain.handle(IpcChannel.auth.login, async (_, { url, email, password }) => {
    const ses = session.fromPartition(partition)
    await clearSessionCookies(ses)
    try {
      const result = await postLoginForm(
        ses,
        url,
        new URLSearchParams({ email, password, action: 'login' })
      )
      if (!result.ok) await clearSessionCookies(ses)
      return result
    } catch (error) {
      logMainError('login', error)
      await clearSessionCookies(ses)
      return { ok: false, message: 'network_error' }
    }
  })

  ipcMain.handle(IpcChannel.auth.logout, async () => {
    const ses = session.fromPartition(partition)
    const saved = store.readSettings()
    if (saved?.url && typeof saved.url === 'string') {
      try {
        await postLoginForm(ses, saved.url, new URLSearchParams({ action: 'logout' }))
      } catch (error) {
        logMainError('logout.remote', error)
      }
    }
    await clearSessionCookies(ses)
    return true
  })

  ipcMain.handle(IpcChannel.auth.getChatBoot, async (_, { url, config, data }) => {
    const ses = session.fromPartition(partition)
    const params = new URLSearchParams()
    if (config) params.set('config', config)
    if (data) params.set('data', data)
    const qs = params.toString()
    try {
      const resp = await net.fetch(`${url}/ai/boot${qs ? `?${qs}` : ''}`, { session: ses })
      if (!resp.ok) return null
      return await resp.json()
    } catch (error) {
      logMainError('get-chat-boot', error)
      return null
    }
  })

  ipcMain.handle(IpcChannel.auth.getSkills, async (_, { url }) => {
    const ses = session.fromPartition(partition)
    try {
      const resp = await net.fetch(`${url}/ai/skills`, { session: ses })
      if (!resp.ok) return []
      return await resp.json()
    } catch (error) {
      logMainError('get-skills', error)
      return []
    }
  })
}
