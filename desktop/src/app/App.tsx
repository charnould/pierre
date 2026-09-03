import { useState, useEffect, useCallback, useRef, useMemo, startTransition } from 'react'

import { AgentIdentityProvider, DEFAULT_AGENT_NAME } from '@/contexts/AgentIdentityContext'
import {
  NavigationHistoryProvider,
  useNavigationHistory
} from '@/contexts/NavigationHistoryContext'
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { UiSettingsProvider, useResolvedUiSettings } from '@/contexts/UiSettingsContext'
import { ActivityPanel } from '@/features/activity'
import { ActivityNotificationsTrigger } from '@/features/activity/components/ActivityNotificationsTrigger'
import { ActivityTasksTrigger } from '@/features/activity/components/ActivityTasksTrigger'
import { useActivityFeed } from '@/features/activity/hooks/useActivityFeed'
import { ActivityRailProvider, useActivityRail } from '@/features/activity/lib/ActivityRailContext'
import { restoreSession } from '@/features/auth'
import { TasksPanel } from '@/features/home/TasksPanel'
import { useHomeOpenActions } from '@/features/home/use-home-open-actions'
import { FindInPageBar } from '@/shared/components/find-in-page/FindInPageBar'
import { TitleBar } from '@/shared/components/layout/TitleBar'
import { toast, Toaster } from '@/shared/components/ui/toast'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import {
  hydrateCustomizationFromServer,
  resetCustomization
} from '@/shared/lib/instance-customization'
import { setSetupAdministrator, useSetupRequest } from '@/shared/lib/open-setup'
import { fetchOrgUsers } from '@/shared/lib/org-users-cache'
import { releaseHiddenPanelFocus } from '@/shared/lib/release-hidden-panel-focus'
import { readStoredTab, tabAfterAutoLogin, writeStoredTab } from '@/shared/lib/session-tab'
import { isSettingsConfigured } from '@/shared/lib/settings-configured'
import { canAccessTab, type Tab } from '@/shared/lib/tab-registry'
import { resolveHomeSettings } from '@/shared/lib/ui-settings/schema'
import { useAppEscapeHome } from '@/shared/lib/use-app-escape-home'
import type { Settings } from '@/shared/types'
import type { UserPrincipal } from '@/shared/types/users'

import { TabWorkspace } from './TabWorkspace'

interface AppContentProps {
  activeTab: Tab
  settings: Settings
  isLoggedIn: boolean
  user: UserPrincipal | null
  agentName: string
  onTabChange: (tab: Tab) => void
  setSettings: React.Dispatch<React.SetStateAction<Settings>>
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>
  setAgentName: React.Dispatch<React.SetStateAction<string>>
  setUser: React.Dispatch<React.SetStateAction<UserPrincipal | null>>
}

function AppContent({
  activeTab,
  settings,
  isLoggedIn,
  user,
  agentName,
  onTabChange,
  setSettings,
  setIsLoggedIn,
  setAgentName,
  setUser
}: AppContentProps) {
  const { navigate } = useNavigationHistory()

  const handleTabChange = useCallback(
    (tab: Tab) => {
      if (!canAccessTab(tab, user)) return
      startTransition(() => {
        navigate({ tab })
      })
    },
    [navigate, user]
  )

  const setupRequest = useSetupRequest()

  useEffect(() => {
    setSetupAdministrator(user?.isAdministrator === true)
  }, [user])

  useEffect(() => {
    if (setupRequest) handleTabChange('administration')
  }, [handleTabChange, setupRequest])

  const handleLogin = useCallback(
    (s: Settings, meta: { user: UserPrincipal }) => {
      setSettings(s)
      setUser(meta.user)
      if (s.url) {
        void hydrateCustomizationFromServer(s.url).then((name) => {
          if (name) setAgentName(name)
        })
      }
      // Main freezes the renderer, swaps UI via onAuthWindowLayoutSwap, then animates.
      void (async () => {
        await window.api?.setAuthWindowLayout?.({ loggedIn: true })
        toast.add({ title: 'Connexion réussie', type: 'success' })
      })()
    },
    [setAgentName, setSettings, setUser]
  )

  const endSession = useCallback(async () => {
    resetCustomization()
    setAgentName(DEFAULT_AGENT_NAME)
    setUser(null)
    await window.api?.logout()
    await window.api?.setAuthWindowLayout?.({ loggedIn: false })
  }, [setAgentName, setUser])

  useEffect(() => {
    return window.api?.onAuthWindowLayoutSwap?.(({ loggedIn }) => {
      if (loggedIn) {
        setIsLoggedIn(true)
        onTabChange('home')
        navigate({ tab: 'home' }, { replace: true })
      } else {
        resetCustomization()
        setAgentName(DEFAULT_AGENT_NAME)
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
  }, [navigate, onTabChange, setAgentName, setIsLoggedIn])

  const handleSettingsChange = useCallback(
    (next: Settings) => {
      setSettings(next)
    },
    [setSettings]
  )

  const userLogin = useMemo(() => (user?.email ?? '').trim().toLowerCase(), [user])

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
  const { readerTarget, setOpen, tasksOpen } = useActivityRail()
  const homeVisible = isLoggedIn && activeTab === 'home'
  const excerpts = resolveHomeSettings(useResolvedUiSettings())
  const {
    mine,
    delegated,
    refresh,
    loadMoreMine,
    loadMoreDelegated,
    hasMoreMine,
    hasMoreDelegated
  } = useHomeOpenActions({
    url: settings.url,
    enabled: isLoggedIn && (homeVisible || tasksOpen),
    mineLimit: excerpts.mine,
    delegatedLimit: excerpts.delegated
  })

  useEffect(() => {
    void window.api?.setMascotUnreadCount?.(feed.unreadCount, { orbit: activeTab !== 'home' })
  }, [activeTab, feed.unreadCount])

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

  useEffect(() => {
    if (!isLoggedIn || !user || canAccessTab(activeTab, user)) return
    navigate({ tab: 'home' }, { replace: true })
  }, [activeTab, isLoggedIn, navigate, user])

  const goHome = useCallback(() => {
    handleTabChange('home')
    navigate({ tab: 'home' })
  }, [handleTabChange, navigate])

  useAppEscapeHome({ activeTab, isLoggedIn, onGoHome: goHome })

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TitleBar
        activeTab={activeTab}
        user={user}
        onTabChange={handleTabChange}
        notifications={<ActivityNotificationsTrigger unreadCount={feed.unreadCount} />}
        tasks={<ActivityTasksTrigger />}
      />
      <ActivityPanel feed={feed} url={settings.url} userLogin={userLogin} />
      <TasksPanel
        mine={mine}
        delegated={delegated}
        hasMoreMine={hasMoreMine}
        hasMoreDelegated={hasMoreDelegated}
        onLoadMoreMine={() => void loadMoreMine()}
        onLoadMoreDelegated={() => void loadMoreDelegated()}
      />
      <main className="bg-background relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <TabWorkspace
          activeTab={activeTab}
          isLoggedIn={isLoggedIn}
          settings={settings}
          agentName={agentName}
          userLogin={userLogin}
          feed={feed}
          notifications={notifications}
          repaymentDeps={repaymentDeps}
          readerTarget={readerTarget}
          onTabChange={handleTabChange}
          onLogin={handleLogin}
          onCurrentUserPasswordChange={endSession}
          onUserChange={setUser}
          onLogout={() => void endSession()}
          onSettingsChange={handleSettingsChange}
          user={user}
          mine={mine}
          delegated={delegated}
          refreshOpenActions={refresh}
        />
      </main>
    </div>
  )
}

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('settings')
  const [settings, setSettings] = useState<Settings>({})
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [agentName, setAgentName] = useState(DEFAULT_AGENT_NAME)
  const [user, setUser] = useState<UserPrincipal | null>(null)

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
        const result = await restoreSession()
        if (result.ok) {
          setUser(result.user)
          setIsLoggedIn(true)
          void window.api?.setAuthWindowLayout?.({ loggedIn: true })
          const stored = readStoredTab()
          const restored = tabAfterAutoLogin(stored)
          const tab = canAccessTab(restored, result.user) ? restored : 'home'
          setActiveTab(tab)
          writeStoredTab(tab)
          void hydrateCustomizationFromServer(s.url!).then((name) => {
            if (name) setAgentName(name)
          })
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
                  user={user}
                  agentName={agentName}
                  onTabChange={onTabChange}
                  setSettings={setSettings}
                  setIsLoggedIn={setIsLoggedIn}
                  setAgentName={setAgentName}
                  setUser={setUser}
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
