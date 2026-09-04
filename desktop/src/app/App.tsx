import { useState, useEffect, useCallback, useRef, useMemo, startTransition } from 'react'

import { AgentIdentityProvider, DEFAULT_AGENT_NAME } from '@/contexts/AgentIdentityContext'
import {
  NavigationHistoryProvider,
  useNavigationHistory
} from '@/contexts/NavigationHistoryContext'
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { UiSettingsProvider } from '@/contexts/UiSettingsContext'
import { ActivityPanel } from '@/features/activity'
import { useActivityFeed } from '@/features/activity/hooks/useActivityFeed'
import { ActivityRailProvider, useActivityRail } from '@/features/activity/lib/ActivityRailContext'
import { loginWithStoredCredentials } from '@/features/auth'
import { fetchConfig } from '@/features/settings'
import { FindInPageBar } from '@/shared/components/find-in-page/FindInPageBar'
import { AppSidebar } from '@/shared/components/layout/AppSidebar'
import { TitleBar } from '@/shared/components/layout/TitleBar'
import { SidebarInset, SidebarProvider } from '@/shared/components/ui/sidebar'
import { toast, Toaster } from '@/shared/components/ui/toast'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import { fetchOrgUsers } from '@/shared/lib/org-users-cache'
import { releaseHiddenPanelFocus } from '@/shared/lib/release-hidden-panel-focus'
import { readStoredTab, tabAfterAutoLogin, writeStoredTab } from '@/shared/lib/session-tab'
import { isSettingsConfigured } from '@/shared/lib/settings-configured'
import { isGuestAccessibleTab, type Tab } from '@/shared/lib/tab-registry'
import { useAppEscapeHome } from '@/shared/lib/use-app-escape-home'
import type { Settings } from '@/shared/types'

import { TabWorkspace } from './TabWorkspace'

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
      if (!isLoggedIn && !isGuestAccessibleTab(tab)) return
      startTransition(() => {
        navigate({ tab })
      })
    },
    [isLoggedIn, navigate]
  )

  const handleLogin = useCallback(
    (s: Settings, meta?: { agentName?: string }) => {
      setSettings(s)
      if (meta?.agentName) setAgentName(meta.agentName)
      // Main freezes the renderer, swaps UI via onAuthWindowLayoutSwap, then animates.
      void (async () => {
        await window.api?.setAuthWindowLayout?.({ loggedIn: true })
        toast.add({ title: 'Connexion réussie', type: 'success' })
      })()
    },
    [setAgentName, setSettings]
  )

  const handleLogout = useCallback(() => {
    setSettings((prev) => ({ ...prev, password: '', loggedOut: true }))
    void window.api?.setAuthWindowLayout?.({ loggedIn: false })
  }, [setSettings])

  useEffect(() => {
    return window.api?.onAuthWindowLayoutSwap?.(({ loggedIn }) => {
      if (loggedIn) {
        setIsLoggedIn(true)
        onTabChange('home')
        navigate({ tab: 'home' }, { replace: true })
      } else {
        setIsLoggedIn(false)
        navigate({ tab: 'settings' }, { replace: true })
      }
      // Let React commit the swap while #root is still display:none, then ack.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.api?.ackAuthWindowLayoutSwap?.()
        })
      })
    })
  }, [navigate, onTabChange, setIsLoggedIn])

  const handleSettingsChange = useCallback(
    (next: Settings) => {
      setSettings(next)
    },
    [setSettings]
  )

  const userLogin = useMemo(() => (settings.email ?? '').trim().toLowerCase(), [settings.email])

  useEffect(() => {
    if (!isLoggedIn || !settings.url) return
    void fetchOrgUsers(settings.url)
  }, [isLoggedIn, settings.url])

  const feed = useActivityFeed({
    settings,
    onSettingsChange: handleSettingsChange,
    userLogin,
    isLoggedIn
  })
  const notifications = feed.notifications
  const repaymentDeps = useMemo(() => ({ notifications, userLogin }), [notifications, userLogin])
  const { readerTarget, setOpen } = useActivityRail()

  useEffect(() => {
    void window.api?.setMascotUnreadCount?.(feed.unreadCount)
  }, [feed.unreadCount])

  useEffect(() => {
    void window.api?.syncMascotVisibility?.(isLoggedIn)
  }, [isLoggedIn])

  useEffect(() => {
    return window.api?.onOpenNotificationsFromMascot?.(() => {
      setOpen(true)
    })
  }, [setOpen])

  useEffect(() => {
    releaseHiddenPanelFocus()
  }, [activeTab])

  const goHome = useCallback(() => {
    handleTabChange('home')
    navigate({ tab: 'home' })
  }, [handleTabChange, navigate])

  useAppEscapeHome({ activeTab, isLoggedIn, onGoHome: goHome })

  return (
    <SidebarProvider
      open={false}
      onOpenChange={() => {}}
      className="app-shell flex h-full flex-col overflow-hidden"
    >
      <TitleBar />
      <ActivityPanel feed={feed} url={settings.url} userLogin={userLogin} />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {isLoggedIn ? (
          <AppSidebar
            activeTab={activeTab}
            isLoggedIn={isLoggedIn}
            onTabChange={handleTabChange}
            agentName={agentName}
            unreadCount={feed.unreadCount}
          />
        ) : null}
        <SidebarInset className="overflow-hidden">
          <div className="bg-background relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <TabWorkspace
                activeTab={activeTab}
                isLoggedIn={isLoggedIn}
                settings={settings}
                agentName={agentName}
                userLogin={userLogin}
                notifications={notifications}
                repaymentDeps={repaymentDeps}
                readerTarget={readerTarget}
                onTabChange={handleTabChange}
                onLogin={handleLogin}
                onLogout={handleLogout}
                onSettingsChange={handleSettingsChange}
              />
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('settings')
  const [settings, setSettings] = useState<Settings>({})
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [agentName, setAgentName] = useState(DEFAULT_AGENT_NAME)

  const onTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab)
    writeStoredTab(tab)
  }, [])

  useEffect(() => {
    void (async () => {
      const s = await window.api?.getSettings()
      if (!s) return
      setSettings(s)
      if (isSettingsConfigured(s)) {
        const result = await loginWithStoredCredentials()
        if (result.ok) {
          setIsLoggedIn(true)
          void window.api?.setAuthWindowLayout?.({ loggedIn: true })
          const stored = readStoredTab()
          const tab = tabAfterAutoLogin(stored)
          setActiveTab(tab)
          writeStoredTab(tab)
          const config = await fetchConfig(s.url!)
          if (config?.name) setAgentName(config.name)
        } else {
          void window.api?.setAuthWindowLayout?.({ loggedIn: false })
        }
      } else {
        void window.api?.setAuthWindowLayout?.({ loggedIn: false })
      }
    })()
  }, [])

  return (
    <ThemeProvider>
      <UiSettingsProvider>
        <AgentIdentityProvider name={agentName}>
          <NavigationHistoryProvider activeTab={activeTab} onTabChange={onTabChange}>
            <ActivityRailProvider>
              <NavigationBootstrap activeTab={activeTab} />
              <TooltipProvider>
                <Toaster timeout={2500} />
                <FindInPageBar />
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
            </ActivityRailProvider>
          </NavigationHistoryProvider>
        </AgentIdentityProvider>
      </UiSettingsProvider>
    </ThemeProvider>
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
