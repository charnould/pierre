/**
 * Rewrites `pierre-ia` Set-Cookie so cross-site Electron frames can send it over HTTPS.
 * On HTTP (e.g. localhost), leaves the cookie unchanged so Secure is not forced.
 */
export function patchAuthSetCookieHeaders(
  headers: Record<string, string[] | string | undefined>,
  options: { secure: boolean }
): void {
  const raw = headers['set-cookie'] ?? headers['Set-Cookie']
  if (!raw) return
  const list = Array.isArray(raw) ? raw : [raw]
  const patched = list.map((cookie) => {
    if (!cookie.startsWith('pierre-ia=')) return cookie
    const stripped = cookie
      .replace(/;\s*SameSite=[^;]*/gi, '')
      .replace(/;\s*Secure\b/gi, '')
      .trimEnd()
    if (options.secure) {
      return `${stripped}; SameSite=None; Secure`
    }
    return stripped
  })
  headers['set-cookie'] = patched
  delete headers['Set-Cookie']
}
