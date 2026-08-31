/**
 * Tracks which of several overlapping requests is the latest, so a slow earlier
 * response can be dropped instead of overwriting state that belongs to a newer one.
 *
 * `window.api.*` calls are `ipcRenderer.invoke` and cannot be aborted; ignoring a
 * stale response is the renderer-side equivalent.
 */
export type RequestSequencer = {
  /** Marks a new request as the latest and returns its token. */
  begin: () => number
  /** True while `token` is still the most recently started request. */
  isCurrent: (token: number) => boolean
}

export function createRequestSequencer(): RequestSequencer {
  let latest = 0
  return {
    begin: () => {
      latest += 1
      return latest
    },
    isCurrent: (token: number) => token === latest
  }
}
