import { net, type Session } from 'electron'

/** Electron `net.fetch` options — DOM RequestInit omits `session`. */
export type NetFetchInit = RequestInit & {
  bypassCustomProtocolHandlers?: boolean
  session?: Session
}

export function netFetch(input: string | URL, init?: NetFetchInit): ReturnType<typeof net.fetch> {
  const url = typeof input === 'string' ? input : input.href
  return net.fetch(url, init as Parameters<typeof net.fetch>[1])
}
