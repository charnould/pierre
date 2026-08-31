import { createContext, useCallback, useEffect, type ReactNode } from 'react'

type Theme = 'light'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyLightTheme() {
  document.documentElement.classList.remove('dark')
  document.documentElement.classList.add('light')
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

/**
 * Pierre is light-only. The provider still owns the document theme class so the
 * shell has a single place that enforces that product decision.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const setTheme = useCallback((theme: Theme) => {
    if (theme !== 'light') return
    applyLightTheme()
  }, [])

  useEffect(() => {
    applyLightTheme()
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return
      if (event.key.toLowerCase() !== 'd') return
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) return
      event.preventDefault()
      setTheme('light')
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setTheme])

  return (
    <ThemeContext.Provider value={{ theme: 'light', setTheme }}>{children}</ThemeContext.Provider>
  )
}
