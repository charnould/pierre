import { LayoutGrid, Settings } from 'lucide-react'
import type { ComponentType } from 'react'

import { PANEL_IDENTITY, PANEL_NAV_TABS } from '@/shared/lib/panel-identity'
import type { Tab } from '@/shared/lib/tabs'

export interface NavItem {
  id: Tab
  label: string
  icon: ComponentType<{ className?: string }>
}

const HOME_ITEM: NavItem = { id: 'home', label: 'Accueil', icon: LayoutGrid }

const SETTINGS_ITEM: NavItem = { id: 'settings', label: 'Paramètres', icon: Settings }

function panelNavItem(tab: (typeof PANEL_NAV_TABS)[number], agentName: string): NavItem {
  const identity = PANEL_IDENTITY[tab]
  return {
    id: tab,
    label: tab === 'chat' ? `Discuter avec ${agentName}` : identity!.label,
    icon: identity!.icon as ComponentType<{ className?: string }>
  }
}

export function buildNavItems(agentName: string): NavItem[] {
  return [HOME_ITEM, ...PANEL_NAV_TABS.map((tab) => panelNavItem(tab, agentName))]
}

export function buildSettingsNavItem(): NavItem {
  return SETTINGS_ITEM
}

export function buildUpdatesNavItem(): NavItem {
  const identity = PANEL_IDENTITY.updates!
  return {
    id: 'updates',
    label: identity.label,
    icon: identity.icon as ComponentType<{ className?: string }>
  }
}
