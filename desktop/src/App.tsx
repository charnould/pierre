import { useState, useEffect, useCallback } from 'react'

import { AppSidebar } from './components/layout/AppSidebar'
import { TitleBar } from './components/layout/TabNav'
import { SidebarProvider } from './components/ui/sidebar'
import { TooltipProvider } from './components/ui/tooltip'
import { AboutSummary } from './components/views/AboutSummary'
import { Chat } from './components/views/Chat'
import { Home } from './components/views/Home'
import { RepaymentPlan } from './components/views/RepaymentPlan'
import { RequestReply } from './components/views/RequestReply'
import { fetchConfig, Settings } from './components/views/Settings'
import { REPAYMENT_PLAN_ENABLED } from './lib/feature-flags'
import { readStoredTab, tabAfterAutoLogin, writeStoredTab } from './lib/session-tab'
import type { Tab } from './lib/tabs'
import type { Settings as SettingsType } from './types'

export type { Tab } from './lib/tabs'

export async function doLogin({ url, email, password }: SettingsType): Promise<boolean> {
  try {
    const body = new URLSearchParams({ email: email!, password: password!, action: 'login' })
    const resp = await fetch(`${url}/a/login`, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      redirect: 'follow'
    })
    return resp.ok && !resp.url.includes('message=')
  } catch {
    return false
  }
}

function isConfigured(s: SettingsType) {
  return !!(s?.url && s?.email && s?.password && !s?.loggedOut)
}

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('settings')
  const [settings, setSettings] = useState<SettingsType>({})
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [agentName, setAgentName] = useState("l'agent IA")

  useEffect(() => {
    void (async () => {
      const s = await window.api?.getSettings()
      if (!s) return
      setSettings(s)
      if (isConfigured(s)) {
        const ok = await doLogin(s)
        if (ok) {
          setIsLoggedIn(true)
          const stored = readStoredTab()
          setActiveTab(tabAfterAutoLogin(stored))
          const config = await fetchConfig(s.url!)
          if (config?.name) setAgentName(config.name)
        }
      }
    })()
  }, [])

  const handleTabChange = useCallback(
    (tab: Tab) => {
      if (!isLoggedIn && tab !== 'settings') return
      if (tab === 'repayment' && !REPAYMENT_PLAN_ENABLED) return
      setActiveTab(tab)
      writeStoredTab(tab)
    },
    [isLoggedIn]
  )

  const handleLogin = useCallback((s: SettingsType, name?: string) => {
    setSettings(s)
    setIsLoggedIn(true)
    writeStoredTab('home')
    setTimeout(() => setActiveTab('home'), 700)
    if (name) setAgentName(name)
  }, [])

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false)
    writeStoredTab('settings')
    setActiveTab('settings')
  }, [])

  return (
    <TooltipProvider>
      <div className="bg-background text-foreground flex h-screen flex-col overflow-hidden font-sans antialiased">
        <TitleBar activeTab={activeTab} isLoggedIn={isLoggedIn} />
        <SidebarProvider
          defaultOpen={false}
          className="bg-background min-h-0 flex-1 overflow-hidden"
        >
          <AppSidebar
            activeTab={activeTab}
            isLoggedIn={isLoggedIn}
            onTabChange={handleTabChange}
            agentName={agentName}
          />
          {/* Views stay mounted while hidden so streams and form state survive tab switches. */}
          <main className="bg-background relative flex min-h-0 flex-1 overflow-hidden">
            <Chat hidden={activeTab !== 'chat'} isLoggedIn={isLoggedIn} url={settings.url} />

            <Home
              hidden={activeTab !== 'home'}
              onNavigate={handleTabChange}
              agentName={agentName}
            />

            <RequestReply
              hidden={activeTab !== 'request'}
              settings={settings}
              onNavigate={handleTabChange}
              agentName={agentName}
            />

            {REPAYMENT_PLAN_ENABLED ? (
              <RepaymentPlan
                hidden={activeTab !== 'repayment'}
                settings={settings}
                onNavigate={handleTabChange}
                agentName={agentName}
              />
            ) : null}

            <AboutSummary
              hidden={activeTab !== 'about'}
              settings={settings}
              onNavigate={handleTabChange}
              agentName={agentName}
            />

            <Settings
              hidden={activeTab !== 'settings'}
              settings={settings}
              isLoggedIn={isLoggedIn}
              onLogin={handleLogin}
              onLogout={handleLogout}
            />
          </main>
        </SidebarProvider>
      </div>
    </TooltipProvider>
  )
}
