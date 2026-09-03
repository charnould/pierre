import {
  Activity,
  ArrowRightLeft,
  Bot,
  ClipboardList,
  Handshake,
  LayoutGrid,
  Mails,
  MessageSquareReply,
  PiggyBank,
  Settings,
  ShieldCheck,
  Workflow,
  Wrench
} from 'lucide-react'
import type { ComponentType } from 'react'

import type { BusinessModuleId } from '../../../../shared/modules'

interface TabIdentity {
  icon: ComponentType<{ className?: string; size?: number; strokeWidth?: number }>
  label: string
  /** When true, the home door label becomes `Discuter avec ${agentName}`. */
  labelUsesAgentName?: boolean
}

type TabNavGroup = 'home' | 'panel' | 'footer'

interface TabDefinition {
  id: string
  navGroup: TabNavGroup
  identity: TabIdentity
  guestAccessible?: boolean
  moduleId?: BusinessModuleId
  administratorOnly?: boolean
}

/** Single source of truth for navigation tabs (order matters for panel tiles). */
export const TAB_REGISTRY = [
  {
    id: 'home',
    navGroup: 'home',
    identity: { icon: LayoutGrid, label: 'Accueil' }
  },
  {
    id: 'chat',
    navGroup: 'panel',
    identity: {
      icon: Bot,
      label: 'Obtenir des informations',
      labelUsesAgentName: true
    }
  },
  {
    id: 'tickets',
    navGroup: 'panel',
    identity: { icon: MessageSquareReply, label: 'Traiter les réclamations' },
    moduleId: 'tickets'
  },
  {
    id: 'automations',
    navGroup: 'panel',
    identity: { icon: Workflow, label: 'Créer des automatisations' },
    moduleId: 'automations'
  },
  {
    id: 'bulk',
    navGroup: 'panel',
    identity: { icon: Mails, label: 'Contacter par lots' },
    moduleId: 'bulk'
  },
  {
    id: 'about',
    navGroup: 'panel',
    identity: { icon: Activity, label: 'Obtenir une synthèse' },
    moduleId: 'about'
  },
  {
    id: 'repayment',
    navGroup: 'panel',
    identity: { icon: PiggyBank, label: 'Piloter les impayés' },
    moduleId: 'repayment'
  },
  {
    id: 'insurance-attestation',
    navGroup: 'panel',
    identity: { icon: ShieldCheck, label: 'Renouveler les assurances' },
    moduleId: 'insurance-attestation'
  },
  {
    id: 'relocation',
    navGroup: 'panel',
    identity: { icon: ArrowRightLeft, label: 'Piloter la relocation' },
    moduleId: 'relocation'
  },
  {
    id: 'attributions',
    navGroup: 'panel',
    identity: { icon: ClipboardList, label: 'Piloter les attributions' },
    moduleId: 'attributions'
  },
  {
    id: 'ventes',
    navGroup: 'panel',
    identity: { icon: Handshake, label: 'Piloter les ventes' },
    moduleId: 'ventes'
  },
  {
    id: 'administration',
    navGroup: 'footer',
    identity: { icon: Wrench, label: 'Administration' },
    administratorOnly: true
  },
  {
    id: 'settings',
    navGroup: 'footer',
    identity: { icon: Settings, label: 'Paramètres' },
    guestAccessible: true
  }
] as const satisfies readonly TabDefinition[]

export type Tab = (typeof TAB_REGISTRY)[number]['id']

const TAB_SET = new Set<string>(TAB_REGISTRY.map((entry) => entry.id))

const registryById = Object.fromEntries(TAB_REGISTRY.map((entry) => [entry.id, entry])) as Record<
  Tab,
  (typeof TAB_REGISTRY)[number]
>

/** Empty feature panels temporarily hidden from home navigation. */
export const HIDDEN_PANEL_TABS = [
  'insurance-attestation',
  'relocation',
  'attributions',
  'ventes'
] as const satisfies readonly Tab[]

const HIDDEN_PANEL_TAB_SET = new Set<Tab>(HIDDEN_PANEL_TABS)

/** All valid navigation tab ids. */
export const TABS = TAB_REGISTRY.map((entry) => entry.id)

/** Visible feature panels in home tiles (excluding home and settings). */
export const PANEL_NAV_TABS = TAB_REGISTRY.filter(
  (entry) => entry.navGroup === 'panel' && !HIDDEN_PANEL_TAB_SET.has(entry.id)
).map((entry) => entry.id) as Tab[]

/** Tabs reachable without logging in. */
export const GUEST_ACCESSIBLE_TABS = TAB_REGISTRY.filter(
  (entry): entry is (typeof TAB_REGISTRY)[number] & { guestAccessible: true } =>
    'guestAccessible' in entry && entry.guestAccessible === true
).map((entry) => entry.id) as Tab[]

export interface PanelIdentity {
  icon: TabIdentity['icon']
  label: string
}

/** Labels and icons for home tiles and TitleBar tooltips. */
export const PANEL_IDENTITY = Object.fromEntries(
  TAB_REGISTRY.map((entry) => [
    entry.id,
    { icon: entry.identity.icon, label: entry.identity.label }
  ])
) as unknown as Record<Tab, PanelIdentity>

export function isTab(value: string): value is Tab {
  return TAB_SET.has(value)
}

export function isGuestAccessibleTab(tab: Tab): boolean {
  const entry = registryById[tab]
  return entry != null && 'guestAccessible' in entry && entry.guestAccessible === true
}

export function isPanelTabVisible(tab: Tab): boolean {
  return !HIDDEN_PANEL_TAB_SET.has(tab)
}

export function moduleIdForTab(tab: Tab): BusinessModuleId | null {
  const entry = registryById[tab]
  return entry && 'moduleId' in entry ? entry.moduleId : null
}

export function canAccessTab(
  tab: Tab,
  user: {
    isAdministrator: boolean
    moduleIds: readonly BusinessModuleId[]
    chatbotIds: readonly string[]
  } | null
): boolean {
  if (isGuestAccessibleTab(tab)) return true
  if (!user) return false
  if (tab === 'chat') return true
  const entry = registryById[tab]
  if ('administratorOnly' in entry && entry.administratorOnly) return user.isAdministrator
  const moduleId = moduleIdForTab(tab)
  if (!moduleId) return true
  return isPanelTabVisible(tab) && user.moduleIds.includes(moduleId)
}

export function tabNavLabel(tab: Tab, agentName: string): string {
  const entry = registryById[tab]
  if (!entry) return tab
  if ('labelUsesAgentName' in entry.identity && entry.identity.labelUsesAgentName) {
    return `Discuter avec ${agentName}`
  }
  return entry.identity.label
}
