import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useCallback } from 'react'

import { useNavigationHistory } from '@/contexts/NavigationHistoryContext'

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC')

const iconClass = 'size-3.5 shrink-0'

const navBtnBase =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_1.5px_var(--ring)] disabled:pointer-events-none disabled:opacity-50'

const historyBtnClass = `${navBtnBase} text-muted-foreground hover:text-foreground hover:bg-muted/60`

export function TitleBar() {
  const { showTitleBarHistory, canGoBack, canGoForward, goBack, goForward } = useNavigationHistory()

  const handleBack = useCallback(() => {
    void goBack()
  }, [goBack])

  const handleForward = useCallback(() => {
    void goForward()
  }, [goForward])

  return (
    <div className="drag bg-background relative z-20 flex h-[var(--titlebar-height)] w-full shrink-0 items-center">
      {isMac && <div className="w-[90px] shrink-0" />}
      {showTitleBarHistory ? (
        <div className="no-drag flex items-center pl-1">
          <button
            type="button"
            aria-label="Retour"
            disabled={!canGoBack}
            onClick={handleBack}
            className={historyBtnClass}
          >
            <ArrowLeft className={iconClass} />
          </button>
          <button
            type="button"
            aria-label="Avancer"
            disabled={!canGoForward}
            onClick={handleForward}
            className={historyBtnClass}
          >
            <ArrowRight className={iconClass} />
          </button>
        </div>
      ) : null}
    </div>
  )
}
