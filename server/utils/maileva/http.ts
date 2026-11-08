import { mailevaApi, mailevaHosts, type MailevaTarget } from './endpoints'

export class MailevaError extends Error {
  constructor(
    message: string,
    readonly code: 'not_configured' | 'unavailable' | 'rejected' | 'invalid_response',
    readonly retryable: boolean
  ) {
    super(message)
    this.name = 'MailevaError'
  }
}

export type MailevaAuth = {
  target: MailevaTarget
  clientId: string
  clientSecret: string
  username: string
  password: string
}

type Token = { value: string; until: number }
type MailevaTransport = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

const tokens = new Map<string, Token>()
let transport: MailevaTransport = globalThis.fetch
let clock = (): number => Date.now()

export const set_maileva_transport_for_tests = (next: MailevaTransport | null): void => {
  transport = next ?? globalThis.fetch
  tokens.clear()
}

export const set_maileva_clock_for_tests = (next: (() => number) | null): void => {
  clock = next ?? (() => Date.now())
}

export const clear_maileva_sessions_for_tests = (): void => {
  tokens.clear()
}

const inflight = new Map<string, Promise<unknown>>()

export function singleflight<T>(key: string, run: () => Promise<T>): Promise<T> {
  const current = inflight.get(key) as Promise<T> | undefined
  if (current) return current
  const promise = run().finally(() => {
    if (inflight.get(key) === promise) inflight.delete(key)
  })
  inflight.set(key, promise)
  return promise
}

function redact(value: string): string {
  return value.replace(/otp_code=[^&\s]+/gi, 'otp_code=redacted').slice(0, 300)
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    if (!response.ok) {
      throw new MailevaError(
        `Maileva a répondu ${response.status}`,
        response.status >= 500 ? 'unavailable' : 'rejected',
        response.status >= 500
      )
    }
    throw new MailevaError('Réponse Maileva illisible', 'invalid_response', true)
  }
}

export async function mailevaToken(auth: MailevaAuth, force = false): Promise<string> {
  const key = `${auth.target}:${auth.clientId}:${auth.username}`
  const cached = tokens.get(key)
  if (!force && cached && cached.until > clock() + 30_000) return cached.value
  return singleflight(`token:${key}`, async () => {
    let response: Response
    try {
      response = await transport(`${mailevaHosts(auth.target).auth}/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: auth.clientId,
          client_secret: auth.clientSecret,
          username: auth.username,
          password: auth.password
        }),
        signal: AbortSignal.timeout(15_000)
      })
    } catch {
      throw new MailevaError('Maileva est injoignable', 'unavailable', true)
    }
    const body = await readJson(response)
    const accessToken =
      body &&
      typeof body === 'object' &&
      typeof (body as { access_token?: unknown }).access_token === 'string'
        ? (body as { access_token: string }).access_token
        : ''
    const expires =
      body &&
      typeof body === 'object' &&
      typeof (body as { expires_in?: unknown }).expires_in === 'number'
        ? (body as { expires_in: number }).expires_in
        : 3600
    if (!response.ok || !accessToken) {
      throw new MailevaError(
        response.status === 400 || response.status === 401
          ? 'Maileva a refusé les identifiants'
          : 'Jeton Maileva indisponible',
        response.status === 400 || response.status === 401 ? 'rejected' : 'unavailable',
        response.status !== 400 && response.status !== 401
      )
    }
    tokens.set(key, { value: accessToken, until: clock() + expires * 1000 })
    return accessToken
  })
}

export async function mailevaRequest(
  auth: MailevaAuth,
  path: string,
  init: RequestInit = {},
  retried = false
): Promise<{ status: number; body: unknown }> {
  const token = await mailevaToken(auth, retried)
  const headers = new Headers(init.headers)
  headers.set('authorization', `Bearer ${token}`)
  headers.set('accept', 'application/json')
  let response: Response
  try {
    response = await transport(path.startsWith('https://') ? path : mailevaApi(auth.target, path), {
      ...init,
      headers,
      redirect: 'error',
      signal: AbortSignal.timeout(15_000)
    })
  } catch (error) {
    throw new MailevaError(
      redact(error instanceof Error ? error.message : 'Maileva est injoignable'),
      'unavailable',
      true
    )
  }
  if (response.status === 401 && !retried) {
    tokens.delete(`${auth.target}:${auth.clientId}:${auth.username}`)
    return mailevaRequest(auth, path, init, true)
  }
  const body = await readJson(response)
  if (response.status === 429 || response.status >= 500) {
    throw new MailevaError(`Maileva a répondu ${response.status}`, 'unavailable', true)
  }
  if (!response.ok) {
    const code = errorCode(body)
    if (code === 'DUPLICATE_SENDING_DETECTED') return { status: response.status, body }
    throw new MailevaError(
      redact(errorMessage(body) || `Maileva a refusé l’envoi (${response.status})`),
      'rejected',
      false
    )
  }
  return { status: response.status, body }
}

export function errorCode(body: unknown): string {
  const record = asRecord(body)
  if (typeof record?.['code'] === 'string') return record['code']
  const errors = record?.['errors']
  const first = Array.isArray(errors) ? asRecord(errors[0]) : null
  return typeof first?.['code'] === 'string' ? first['code'] : ''
}

function errorMessage(body: unknown): string {
  const record = asRecord(body)
  if (typeof record?.['message'] === 'string') return record['message']
  const errors = record?.['errors']
  const first = Array.isArray(errors) ? asRecord(errors[0]) : null
  return typeof first?.['message'] === 'string' ? first['message'] : ''
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function resourceId(body: unknown): string {
  const record = asRecord(body)
  const id = record?.['id'] ?? record?.['sending_id']
  return typeof id === 'string' ? id : ''
}

export function findUuid(value: string): string {
  return value.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] ?? ''
}
