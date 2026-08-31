import { lazy, Suspense } from 'react'

import { ActivityReaderOverlay } from '@/features/activity/components/ActivityReaderOverlay'
import type { NotificationsApi } from '@/features/activity/hooks/use-notifications'
import type { ReaderTarget } from '@/features/activity/lib/reader-target'
import { HomeView } from '@/features/home'
import { PLACEHOLDER_TABS, PlaceholderFeatureView } from '@/features/placeholder'
import { SettingsView } from '@/features/settings'
import type { Tab } from '@/shared/lib/tabs'
import { useVisitedTabs } from '@/shared/lib/use-visited-tabs'
import type { Settings } from '@/shared/types'

const ChatView = lazy(() => import('@/features/chat').then((m) => ({ default: m.ChatView })))
const TicketsView = lazy(() =>
  import('@/features/tickets').then((m) => ({ default: m.TicketsView }))
)
const RepaymentView = lazy(() =>
  import('@/features/repayment').then((m) => ({ default: m.RepaymentView }))
)
const AutomationsView = lazy(() =>
  import('@/features/automations').then((m) => ({ default: m.AutomationsView }))
)
const BulkOperationsView = lazy(() =>
  import('@/features/outreach/BulkOperationsView').then((m) => ({ default: m.BulkOperationsView }))
)
const AboutView = lazy(() => import('@/features/about').then((m) => ({ default: m.AboutView })))

function LazyTabFallback() {
  return <div className="bg-background absolute inset-0" />
}

interface Props {
  activeTab: Tab
  isLoggedIn: boolean
  settings: Settings
  agentName: string
  userLogin: string
  notifications: NotificationsApi
  repaymentDeps: { notifications: NotificationsApi; userLogin: string }
  readerTarget: ReaderTarget | null
  onTabChange: (tab: Tab) => void
  onLogin: (s: Settings, meta?: { agentName?: string }) => void
  onLogout: () => void
  onSettingsChange: (settings: Settings) => void
}

export function TabWorkspace({
  activeTab,
  isLoggedIn,
  settings,
  agentName,
  userLogin,
  notifications,
  repaymentDeps,
  readerTarget,
  onTabChange,
  onLogin,
  onLogout,
  onSettingsChange
}: Props) {
  const visited = useVisitedTabs(activeTab, isLoggedIn)

  return (
    <>
      {visited.has('home') ? (
        <HomeView hidden={activeTab !== 'home'} onNavigate={onTabChange} agentName={agentName} />
      ) : null}

      <SettingsView
        hidden={activeTab !== 'settings'}
        settings={settings}
        isLoggedIn={isLoggedIn}
        agentName={agentName}
        onLogin={onLogin}
        onLogout={onLogout}
        onSettingsChange={onSettingsChange}
      />

      <Suspense fallback={<LazyTabFallback />}>
        {visited.has('chat') ? (
          <ChatView
            hidden={activeTab !== 'chat'}
            isLoggedIn={isLoggedIn}
            agentName={agentName}
            url={settings.url}
          />
        ) : null}

        {visited.has('tickets') ? (
          <TicketsView
            hidden={activeTab !== 'tickets'}
            settings={settings}
            onNavigate={onTabChange}
            agentName={agentName}
            userLogin={userLogin}
            notifications={notifications}
          />
        ) : null}

        {visited.has('repayment') ? (
          <RepaymentView
            hidden={activeTab !== 'repayment'}
            url={settings.url}
            repaymentDeps={repaymentDeps}
          />
        ) : null}

        {visited.has('about') ? (
          <AboutView
            hidden={activeTab !== 'about'}
            settings={settings}
            onNavigate={onTabChange}
            agentName={agentName}
          />
        ) : null}

        {visited.has('automations') ? (
          <AutomationsView
            hidden={activeTab !== 'automations'}
            agentName={agentName}
            userLogin={userLogin}
            settings={settings}
            notifications={notifications}
          />
        ) : null}

        {visited.has('bulk') ? (
          <BulkOperationsView
            hidden={activeTab !== 'bulk'}
            settings={settings}
            userLogin={userLogin}
          />
        ) : null}
      </Suspense>

      {PLACEHOLDER_TABS.map((tab) =>
        visited.has(tab) ? (
          <PlaceholderFeatureView key={tab} hidden={activeTab !== tab} tab={tab} />
        ) : null
      )}

      {readerTarget ? <ActivityReaderOverlay target={readerTarget} /> : null}
    </>
  )
}
