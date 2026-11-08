import { useEffect } from 'react'

/**
 * Drives the native window title. Electron mirrors `document.title` in the OS
 * title bar as long as the BrowserWindow has no explicit `title` option.
 */
export function useDocumentTitle(label: string | null, active: boolean) {
  useEffect(() => {
    if (!active || !label) return
    const previous = document.title
    document.title = label
    return () => {
      document.title = previous
    }
  }, [label, active])
}
