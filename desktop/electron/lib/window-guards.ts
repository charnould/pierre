import { logMainError } from '../services/logging'

/** Schemes whose origin is meaningful enough to match against an allowlist. */
const ORIGIN_SCHEMES = new Set(['http:', 'https:'])

/**
 * Decides whether a top-level navigation may proceed.
 *
 * `file:` is matched by scheme (a `file:` URL has an opaque origin), everything
 * else must be `http:`/`https:` with an origin present in `allowedOrigins`.
 * Gating on the scheme first is what rejects `blob:`, whose origin is inherited
 * from the URL it wraps and would otherwise match the allowlist.
 */
export function isAllowedNavigation(targetUrl: string, allowedOrigins: string[]): boolean {
  let parsed: URL
  try {
    parsed = new URL(targetUrl)
  } catch {
    return false
  }
  if (parsed.protocol === 'file:') return allowedOrigins.includes('file:')
  if (!ORIGIN_SCHEMES.has(parsed.protocol)) return false
  return allowedOrigins.includes(parsed.origin)
}

/**
 * Origins the app's own windows (main, mascot) may navigate to: the packaged
 * renderer on disk, plus the dev server origin when running from it.
 */
export function appWindowAllowedOrigins(): string[] {
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (!devUrl) return ['file:']
  try {
    return ['file:', new URL(devUrl).origin]
  } catch {
    return ['file:']
  }
}

/**
 * Denies off-origin navigation, in-app popups and `<webview>` attachment.
 *
 * Must be called on every `BrowserWindow` before it loads anything. When
 * `onExternal` is supplied, a denied popup hands its URL to the caller, which
 * decides whether the OS browser should open it.
 */
export function attachWindowGuards(
  contents: Electron.WebContents,
  options: { allowedOrigins: string[]; onExternal?: (url: string) => void }
): void {
  contents.on('will-navigate', (event, url) => {
    if (isAllowedNavigation(url, options.allowedOrigins)) return
    event.preventDefault()
    logMainError('blocked-navigation', new Error('navigation denied'))
  })

  contents.setWindowOpenHandler(({ url }) => {
    options.onExternal?.(url)
    return { action: 'deny' }
  })

  contents.on('will-attach-webview', (event) => event.preventDefault())
}
