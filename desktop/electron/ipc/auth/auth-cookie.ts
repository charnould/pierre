import type { Session } from 'electron'

import { logMainError } from '../../services/logging'

const COOKIE_NAME = 'pierre-ia'

/** Extracts the `pierre-ia` value from a single Set-Cookie line. */
export function parsePierreAuthCookieValue(setCookieLine: string): string | null {
  const trimmed = setCookieLine.trim()
  if (!trimmed.startsWith(`${COOKIE_NAME}=`)) return null
  const pair = trimmed.split(';')[0] ?? ''
  const eq = pair.indexOf('=')
  if (eq === -1) return null
  try {
    return decodeURIComponent(pair.slice(eq + 1))
  } catch {
    return pair.slice(eq + 1)
  }
}

/** Collects `pierre-ia` Set-Cookie lines from a fetch Response. */
export function pierreAuthCookieLinesFromResponse(resp: Response): string[] {
  const fromGetSetCookie = resp.headers.getSetCookie?.() ?? []
  const fromGetter = fromGetSetCookie.filter((line) => line.startsWith(`${COOKIE_NAME}=`))
  if (fromGetter.length > 0) return fromGetter

  const raw = resp.headers.get('set-cookie')
  if (!raw) return []
  return raw
    .split(/,(?=\s*[^;,]+=)/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith(`${COOKIE_NAME}=`))
}

/** Whether the Electron session already has a `pierre-ia` cookie for this server. */
async function hasPierreAuthCookie(ses: Session, baseUrl: string): Promise<boolean> {
  const byUrl = await ses.cookies.get({ url: baseUrl })
  if (byUrl.some((c) => c.name === COOKIE_NAME)) return true
  const byName = await ses.cookies.get({ name: COOKIE_NAME })
  return byName.length > 0
}

/** Writes `pierre-ia` into the session jar from a Set-Cookie header line. */
async function setPierreAuthCookieFromLine(
  ses: Session,
  baseUrl: string,
  setCookieLine: string
): Promise<boolean> {
  const value = parsePierreAuthCookieValue(setCookieLine)
  if (!value) return false

  const secure = /;\s*Secure\b/i.test(setCookieLine)
  const httpOnly = /;\s*HttpOnly\b/i.test(setCookieLine)
  const pathMatch = setCookieLine.match(/;\s*Path=([^;]+)/i)
  const path = pathMatch?.[1]?.trim() ?? '/'
  const maxAgeMatch = setCookieLine.match(/;\s*Max-Age=(\d+)/i)
  const expirationDate = maxAgeMatch
    ? Math.floor(Date.now() / 1000) + Number.parseInt(maxAgeMatch[1]!, 10)
    : undefined

  try {
    await ses.cookies.set({
      url: baseUrl,
      name: COOKIE_NAME,
      value,
      path,
      secure,
      httpOnly,
      expirationDate
    })
    return true
  } catch (error) {
    logMainError('set-pierre-auth-cookie', error)
    return false
  }
}

/**
 * Ensures `pierre-ia` is present in the session after login — uses the jar first,
 * then parses Set-Cookie from the response when net.fetch did not persist it.
 */
export async function ensurePierreAuthCookie(
  ses: Session,
  baseUrl: string,
  resp: Response
): Promise<boolean> {
  if (await hasPierreAuthCookie(ses, baseUrl)) return true

  for (const line of pierreAuthCookieLinesFromResponse(resp)) {
    await setPierreAuthCookieFromLine(ses, baseUrl, line)
    if (await hasPierreAuthCookie(ses, baseUrl)) return true
  }

  return hasPierreAuthCookie(ses, baseUrl)
}
