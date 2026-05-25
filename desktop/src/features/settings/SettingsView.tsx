import { AnimatePresence, motion } from 'motion/react'

import { EASE, EASE_IN, PANEL_BG_CLASS } from '@/features/workflow/components/WorkflowPanelChrome'
import type { Settings } from '@/shared/types'

import { LoggedInSettingsPage } from './LoggedInSettingsPage'
import { LoginPanel } from './LoginPanel'

export { fetchConfig } from './settings-config'

interface Props {
  hidden: boolean
  settings: Settings
  isLoggedIn: boolean
  agentName: string
  onLogin: (s: Settings, meta?: { agentName?: string }) => void
  onLogout: () => void
  onSettingsChange: (settings: Settings) => void
}

export function SettingsView({
  hidden,
  settings,
  isLoggedIn,
  agentName,
  onLogin,
  onLogout,
  onSettingsChange
}: Props) {
  return (
    <motion.div
      className={`tab-panel absolute inset-0 flex min-h-0 flex-col overflow-hidden ${PANEL_BG_CLASS}`}
      initial={false}
      animate={hidden ? { opacity: 0, scale: 0.985, y: -8 } : { opacity: 1, scale: 1, y: 0 }}
      transition={hidden ? { duration: 0.22, ease: EASE_IN } : { duration: 0.35, ease: EASE }}
      style={{
        pointerEvents: hidden ? 'none' : 'auto',
        zIndex: hidden ? 0 : 1
      }}
    >
      {!hidden && (
        <AnimatePresence mode="wait">
          {isLoggedIn ? (
            <LoggedInSettingsPage
              key="settings"
              settings={settings}
              agentName={agentName}
              onLogout={onLogout}
              onSettingsChange={onSettingsChange}
            />
          ) : (
            <LoginPanel key="login" settings={settings} onLogin={onLogin} />
          )}
        </AnimatePresence>
      )}
    </motion.div>
  )
}
