import type { Tab } from '@/shared/lib/tabs'

const WORKFLOW_TABS = new Set<Tab>(['tickets', 'about'])

export function hasOpenDialog(): boolean {
  return document.querySelector('[data-slot="dialog-content"][data-open]') !== null
}

export function hasOpenFindInPage(): boolean {
  return document.querySelector('[data-find-in-page]') !== null
}

export function hasOpenChatWindow(): boolean {
  return document.querySelector('[data-chat-window]:not([hidden])') !== null
}

export function shouldNavigateHomeOnEscape(options: {
  activeTab: Tab
  isLoggedIn: boolean
  isTypingInField: boolean
  hasOpenDialog: boolean
  hasOpenFindInPage?: boolean
  hasOpenChatWindow?: boolean
}): boolean {
  const {
    activeTab,
    isLoggedIn,
    isTypingInField,
    hasOpenDialog: dialogOpen,
    hasOpenFindInPage: findOpen = false,
    hasOpenChatWindow: chatOpen = false
  } = options
  if (activeTab === 'home') return false
  if (WORKFLOW_TABS.has(activeTab)) return false
  if (!isLoggedIn) return false
  if (isTypingInField) return false
  if (dialogOpen) return false
  if (findOpen) return false
  if (chatOpen) return false
  return true
}
