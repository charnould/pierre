import { useState, useEffect, useCallback } from 'react'

import { AppSidebar } from './components/AppSidebar'
import { DiscuterPanel } from './components/DiscuterPanel'
import { ParametresPanel } from './components/ParametresPanel'
import { RepondrePanel } from './components/RepondrePanel'
import { TitleBar } from './components/TabNav'
import { SidebarProvider } from './components/ui/sidebar'
import { TooltipProvider } from './components/ui/tooltip'
import type { Settings } from './types'

export type Tab = 'repondre' | 'discuter' | 'parametres'

export async function doLogin({ url, email, password }: Settings): Promise<boolean> {
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

function isConfigured(s: Settings) {
  return !!(s?.url && s?.email && s?.password && !s?.loggedOut)
}

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('parametres')
  const [settings, setSettings] = useState<Settings>({})
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [clipboard, setClipboard] = useState('')
  const [clipboardKey, setClipboardKey] = useState(0)

  // Load settings and auto-login on mount
  useEffect(() => {
    void (async () => {
      const s = await window.api?.getSettings()
      if (!s) return
      setSettings(s)
      if (isConfigured(s)) {
        const ok = await doLogin(s)
        if (ok) {
          setIsLoggedIn(true)
          setActiveTab('discuter')
        }
      }
      const initial = await window.api?.readClipboard()
      if (initial) setClipboard(initial)
    })()
  }, [])

  // Register clipboard update listener (increments key to trigger resets in RepondrePanel)
  useEffect(() => {
    window.api?.onClipboardUpdate((text) => {
      setClipboard(text)
      setClipboardKey((k) => k + 1)
    })
  }, [])

  const handleTabChange = useCallback(
    (tab: Tab) => {
      if (!isLoggedIn && (tab === 'repondre' || tab === 'discuter')) return
      setActiveTab(tab)
    },
    [isLoggedIn]
  )

  const handleLogin = useCallback((s: Settings) => {
    setSettings(s)
    setIsLoggedIn(true)
    setTimeout(() => setActiveTab('discuter'), 700)
  }, [])

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false)
    setActiveTab('parametres')
  }, [])

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-gray-50 font-sans text-gray-800 antialiased">
        <TitleBar isLoggedIn={isLoggedIn} onSettingsClick={() => handleTabChange('parametres')} />

        <SidebarProvider defaultOpen={false} className="min-h-0 flex-1 overflow-hidden">
          <AppSidebar activeTab={activeTab} isLoggedIn={isLoggedIn} onTabChange={handleTabChange} />

          <main className="flex flex-1 overflow-hidden">
            <RepondrePanel
              hidden={activeTab !== 'repondre'}
              settings={settings}
              clipboard={clipboard}
              clipboardKey={clipboardKey}
            />

            <DiscuterPanel
              hidden={activeTab !== 'discuter'}
              isLoggedIn={isLoggedIn}
              url={settings.url}
            />

            <ParametresPanel
              hidden={activeTab !== 'parametres'}
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
