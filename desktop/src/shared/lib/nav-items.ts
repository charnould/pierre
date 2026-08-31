import type { ComponentType } from 'react'

import { PANEL_IDENTITY, PANEL_NAV_TABS } from '@/shared/lib/panel-identity'
import { tabNavLabel, type Tab } from '@/shared/lib/tab-registry'

export interface NavItem {
  id: Tab
  label: string
  icon: ComponentType<{ className?: string }>
}

const HOME_TAB = 'home' as const satisfies Tab
const SETTINGS_TAB = 'settings' as const satisfies Tab

function panelNavItem(tab: (typeof PANEL_NAV_TABS)[number], agentName: string): NavItem {
  const identity = PANEL_IDENTITY[tab]
  return {
    id: tab,
    label: tabNavLabel(tab, agentName),
    icon: identity.icon as ComponentType<{ className?: string }>
  }
}

export function buildNavItems(agentName: string): NavItem[] {
  const homeIdentity = PANEL_IDENTITY[HOME_TAB]
  return [
    { id: HOME_TAB, label: homeIdentity.label, icon: homeIdentity.icon },
    ...PANEL_NAV_TABS.map((tab) => panelNavItem(tab, agentName))
  ]
}

export function buildSettingsNavItem(): NavItem {
  const identity = PANEL_IDENTITY[SETTINGS_TAB]
  return {
    id: SETTINGS_TAB,
    label: identity.label,
    icon: identity.icon as ComponentType<{ className?: string }>
  }
}
