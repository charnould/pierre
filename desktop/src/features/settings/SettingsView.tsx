import { AnimatePresence, motion } from 'motion/react'

import { EASE, EASE_IN } from '@/features/workflow/components/WorkflowPanelChrome'
import { cn } from '@/shared/lib/utils'
import type { Settings } from '@/shared/types'
import type { UserPrincipal } from '@/shared/types/users'

import { LoggedInSettingsPage } from './components/LoggedInSettingsPage'
import { LoginPanel } from './components/LoginPanel'

interface Props {
  hidden: boolean
  settings: Settings
  isLoggedIn: boolean
  agentName: string
  onLogin: (s: Settings, meta: { user: UserPrincipal }) => void
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
      data-tab-panel
      className={cn(
        'bg-background absolute inset-0 flex min-h-0 flex-col overflow-hidden',
        hidden ? 'pointer-events-none z-0' : 'pointer-events-auto z-1'
      )}
      initial={false}
      animate={hidden ? { opacity: 0, scale: 0.985, y: -8 } : { opacity: 1, scale: 1, y: 0 }}
      transition={hidden ? { duration: 0.22, ease: EASE_IN } : { duration: 0.35, ease: EASE }}
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
