import type { Context } from 'hono'

import { view } from '../../views/auth.login'

const DEFAULT_REDIRECT = '/c?config=default&data='
const LOCAL_ORIGIN = 'https://pierre.local'

export function safeLoginRedirect(value: string | undefined): string {
  if (!value?.startsWith('/') || value.startsWith('//')) return DEFAULT_REDIRECT
  try {
    const url = new URL(value, LOCAL_ORIGIN)
    if (url.origin !== LOCAL_ORIGIN) return DEFAULT_REDIRECT
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return DEFAULT_REDIRECT
  }
}

export const controller = (c: Context) => c.html(view(safeLoginRedirect(c.req.query('redirect'))))
