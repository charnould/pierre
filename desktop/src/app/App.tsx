import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'

import {
  NavigationHistoryProvider,
  useNavigationHistory
} from '@/contexts/NavigationHistoryContext'
import { UiSettingsProvider } from '@/contexts/UiSettingsContext'
import { AboutView } from '@/features/about/AboutView'
import { loginWithStoredCredentials } from '@/features/auth/credentials'
import { AutomationsView } from '@/features/automations/AutomationsView'
import { ChatView } from '@/features/chat/ChatView'
import { HomeView } from '@/features/home/HomeView'
import { PlaceholderFeatureView } from '@/features/placeholder/PlaceholderFeatureView'
import { fetchConfig, SettingsView } from '@/features/settings/SettingsView'
import { TicketsView } from '@/features/tickets/TicketsView'
import { useUpdatesNotification } from '@/features/updates/hooks/useUpdatesNotification'
import { markEntryRead } from '@/features/updates/lib/updates-notification'
import { UpdatesView } from '@/features/updates/UpdatesView'
import { AppSidebar } from '@/shared/components/layout/AppSidebar'
import { TitleBar } from '@/shared/components/layout/TitleBar'
import { SidebarInset, SidebarProvider } from '@/shared/components/ui/sidebar'
import { Toaster } from '@/shared/components/ui/sonner'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import { defaultTicketsTableState } from '@/shared/lib/navigation-snapshot'
import { getAppPlatform } from '@/shared/lib/platform'
import { releaseHiddenPanelFocus } from '@/shared/lib/release-hidden-panel-focus'
import { readStoredTab, tabAfterAutoLogin, writeStoredTab } from '@/shared/lib/session-tab'
import type { Tab } from '@/shared/lib/tabs'
import { useAppEscapeHome } from '@/shared/lib/use-app-escape-home'
import type { Settings } from '@/shared/types'

export type { Tab } from '@/shared/lib/tabs'

function isConfigured(s: Settings) {
  return !!(s?.url && s?.email && s?.password && !s?.loggedOut)
}

interface AppContentProps {
  activeTab: Tab
  settings: Settings
  isLoggedIn: boolean
  agentName: string
  onTabChange: (tab: Tab) => void
  setSettings: React.Dispatch<React.SetStateAction<Settings>>
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>
  setAgentName: React.Dispatch<React.SetStateAction<string>>
}

function AppContent({
  activeTab,
  settings,
  isLoggedIn,
  agentName,
  onTabChange,
  setSettings,
  setIsLoggedIn,
  setAgentName
}: AppContentProps) {
  const { navigate } = useNavigationHistory()

  const handleTabChange = useCallback(
    (tab: Tab) => {
      if (!isLoggedIn && tab !== 'settings' && tab !== 'updates') return
      if (tab === 'tickets') {
        navigate(
          {
            tab: 'tickets',
            tickets: defaultTicketsTableState()
          },
          { replace: true }
        )
        return
      }
      navigate({ tab })
    },
    [isLoggedIn, navigate]
  )

  const handleLogin = useCallback(
    (s: Settings, meta?: { agentName?: string }) => {
      toast.success('Connexion réussie')
      onTabChange('home')
      navigate({ tab: 'home' }, { replace: true })
      setSettings(s)
      setIsLoggedIn(true)
      if (meta?.agentName) setAgentName(meta.agentName)
    },
    [navigate, onTabChange, setAgentName, setIsLoggedIn, setSettings]
  )

  const handleLogout = useCallback(() => {
    setSettings((prev) => ({ ...prev, password: '', loggedOut: true }))
    setIsLoggedIn(false)
    navigate({ tab: 'settings' }, { replace: true })
  }, [navigate, setIsLoggedIn, setSettings])

  const handleSettingsChange = useCallback(
    (next: Settings) => {
      setSettings(next)
    },
    [setSettings]
  )

  const { unreadCount } = useUpdatesNotification({
    settings,
    onSettingsChange: handleSettingsChange
  })

  const handleMarkUpdateRead = useCallback(
    (slug: string) => {
      const nextReadSlugs = markEntryRead(settings.updatesReadSlugs, slug)
      if (nextReadSlugs === settings.updatesReadSlugs) return
      const { updatesLastSeenSlug: _legacy, ...rest } = settings
      const nextSettings = { ...rest, updatesReadSlugs: nextReadSlugs }
      handleSettingsChange(nextSettings)
      void window.api?.saveSettings(nextSettings)
    },
    [handleSettingsChange, settings]
  )

  useEffect(() => {
    releaseHiddenPanelFocus()
  }, [activeTab])

  const goHome = useCallback(() => {
    handleTabChange('home')
    navigate({ tab: 'home' })
  }, [handleTabChange, navigate])

  useAppEscapeHome({ activeTab, isLoggedIn, onGoHome: goHome })

  const platform = getAppPlatform()

  return (
    <SidebarProvider
      defaultOpen={false}
      data-platform={platform}
      className="app-shell bg-background text-foreground flex h-screen flex-col overflow-hidden font-sans antialiased"
    >
      <TitleBar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <AppSidebar
          activeTab={activeTab}
          isLoggedIn={isLoggedIn}
          onTabChange={handleTabChange}
          agentName={agentName}
          updatesUnreadCount={unreadCount}
        />
        <SidebarInset className="overflow-hidden">
          {/* Views stay mounted while hidden so streams and form state survive tab switches. */}
          <main className="bg-background relative flex min-h-0 flex-1 overflow-hidden">
            <ChatView hidden={activeTab !== 'chat'} isLoggedIn={isLoggedIn} url={settings.url} />

            <HomeView
              hidden={activeTab !== 'home'}
              onNavigate={handleTabChange}
              agentName={agentName}
            />

            <TicketsView
              hidden={activeTab !== 'tickets'}
              settings={settings}
              onNavigate={handleTabChange}
              agentName={agentName}
            />

            <PlaceholderFeatureView hidden={activeTab !== 'repayment'} tab="repayment" />

            <PlaceholderFeatureView
              hidden={activeTab !== 'insurance-attestation'}
              tab="insurance-attestation"
            />

            <PlaceholderFeatureView hidden={activeTab !== 'relocation'} tab="relocation" />

            <AboutView
              hidden={activeTab !== 'about'}
              settings={settings}
              onNavigate={handleTabChange}
              agentName={agentName}
            />

            <AutomationsView
              hidden={activeTab !== 'automations'}
              agentName={agentName}
              settings={settings}
            />

            <UpdatesView
              hidden={activeTab !== 'updates'}
              readSlugs={settings.updatesReadSlugs}
              legacyLastSeenSlug={settings.updatesLastSeenSlug}
              onMarkEntryRead={handleMarkUpdateRead}
            />

            <SettingsView
              hidden={activeTab !== 'settings'}
              settings={settings}
              isLoggedIn={isLoggedIn}
              agentName={agentName}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onSettingsChange={handleSettingsChange}
            />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('settings')
  const [settings, setSettings] = useState<Settings>({})
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [agentName, setAgentName] = useState("l'agent IA")

  const onTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab)
    writeStoredTab(tab)
  }, [])

  useEffect(() => {
    void (async () => {
      const s = await window.api?.getSettings()
      if (!s) return
      setSettings(s)
      if (isConfigured(s)) {
        const result = await loginWithStoredCredentials(s)
        if (result.ok) {
          setIsLoggedIn(true)
          const stored = readStoredTab()
          const tab = tabAfterAutoLogin(stored)
          setActiveTab(tab)
          writeStoredTab(tab)
          const config = await fetchConfig(s.url!)
          if (config?.name) setAgentName(config.name)
        }
      }
    })()
  }, [])

  return (
    <UiSettingsProvider>
      <NavigationHistoryProvider activeTab={activeTab} onTabChange={onTabChange}>
        <NavigationBootstrap activeTab={activeTab} />
        <TooltipProvider>
          <Toaster
            position="top-right"
            duration={2500}
            offset={{
              top: 'calc(var(--titlebar-height) + 0.5rem)',
              right: 16
            }}
          />
          <AppContent
            activeTab={activeTab}
            settings={settings}
            isLoggedIn={isLoggedIn}
            agentName={agentName}
            onTabChange={onTabChange}
            setSettings={setSettings}
            setIsLoggedIn={setIsLoggedIn}
            setAgentName={setAgentName}
          />
        </TooltipProvider>
      </NavigationHistoryProvider>
    </UiSettingsProvider>
  )
}

function NavigationBootstrap({ activeTab }: { activeTab: Tab }) {
  const { navigate } = useNavigationHistory()
  const bootstrappedRef = useRef(false)

  useEffect(() => {
    if (bootstrappedRef.current) return
    bootstrappedRef.current = true
    navigate({ tab: activeTab }, { replace: true })
  }, [activeTab, navigate])

  return null
}
