import { lazy, Suspense } from 'react'

import { cn } from '@/shared/lib/utils'
import type { Settings } from '@/shared/types'
import type { UserPrincipal } from '@/shared/types/users'

import { LoginPanel } from './components/LoginPanel'

const LoggedInSettingsPage = lazy(() =>
  import('./components/LoggedInSettingsPage').then((module) => ({
    default: module.LoggedInSettingsPage
  }))
)

interface Props {
  hidden: boolean
  settings: Settings
  isLoggedIn: boolean
  user: UserPrincipal | null
  agentName: string
  onLogin: (s: Settings, meta: { user: UserPrincipal }) => void
  onUserChange: (user: UserPrincipal) => void
  onHome: () => void
  onLogout: () => void
}

export function SettingsView({
  hidden,
  settings,
  isLoggedIn,
  user,
  agentName,
  onLogin,
  onUserChange,
  onHome,
  onLogout
}: Props) {
  return (
    <div
      data-tab-panel
      className={cn(
        'bg-background absolute inset-0 min-h-0 flex-col overflow-hidden',
        hidden ? 'hidden' : 'flex'
      )}
    >
      {isLoggedIn && user ? (
        <Suspense fallback={null}>
          <LoggedInSettingsPage
            settings={settings}
            user={user}
            agentName={agentName}
            onHome={onHome}
            onUserChange={onUserChange}
            onLogout={onLogout}
          />
        </Suspense>
      ) : (
        <LoginPanel settings={settings} onLogin={onLogin} />
      )}
    </div>
  )
}
