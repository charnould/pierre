import { restoreSession } from '@/features/auth'
import { hydrateCustomizationFromServer } from '@/shared/lib/instance-customization'
import { readStoredTab, tabAfterAutoLogin } from '@/shared/lib/session-tab'
import { isSettingsConfigured } from '@/shared/lib/settings-configured'
import { canAccessTab, type Tab } from '@/shared/lib/tab-registry'
import type { Settings } from '@/shared/types'
import type { UserPrincipal } from '@/shared/types/users'

export type DesktopStartup =
  | { status: 'missing-settings' }
  | { status: 'logged-out'; settings: Settings }
  | {
      status: 'logged-in'
      settings: Settings
      user: UserPrincipal
      tab: Tab
      agentName: string | null
    }

export async function loadDesktopStartup(): Promise<DesktopStartup> {
  const settings = await window.api?.getSettings()
  if (!settings) return { status: 'missing-settings' }
  if (!isSettingsConfigured(settings)) return { status: 'logged-out', settings }
  const result = await restoreSession()
  if (!result.ok) return { status: 'logged-out', settings }
  const restored = tabAfterAutoLogin(readStoredTab())
  const tab = canAccessTab(restored, result.user) ? restored : 'home'
  return {
    status: 'logged-in',
    settings,
    user: result.user,
    tab,
    agentName: await hydrateCustomizationFromServer(settings.url!)
  }
}
