import { useEffect } from 'react'

import { isTypingInField } from '@/features/workflow/lib/workflow-keyboard'
import {
  hasOpenDialog,
  hasOpenFindInPage,
  shouldNavigateHomeOnEscape
} from '@/shared/lib/app-escape-home'
import { isFocusInHiddenPanel } from '@/shared/lib/release-hidden-panel-focus'
import type { Tab } from '@/shared/lib/tabs'

export function useAppEscapeHome(options: {
  activeTab: Tab
  isLoggedIn: boolean
  onGoHome: () => void
}) {
  const { activeTab, isLoggedIn, onGoHome } = options

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      const typing = isTypingInField(e.target) && !isFocusInHiddenPanel(e.target)
      if (
        !shouldNavigateHomeOnEscape({
          activeTab,
          isLoggedIn,
          isTypingInField: typing,
          hasOpenDialog: hasOpenDialog(),
          hasOpenFindInPage: hasOpenFindInPage()
        })
      ) {
        return
      }
      e.preventDefault()
      onGoHome()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeTab, isLoggedIn, onGoHome])
}
