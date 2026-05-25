import {
  Activity,
  ArrowRightLeft,
  Bot,
  CalendarSync,
  MessageSquareReply,
  Newspaper,
  PiggyBank,
  ShieldCheck
} from 'lucide-react'
import type { ComponentType } from 'react'

import type { Tab } from './tabs'

export interface PanelIdentity {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
  label: string
}

/** Order of feature panels in home tiles and sidebar (excluding home, settings, updates). */
export const PANEL_NAV_TABS = [
  'chat',
  'tickets',
  'automations',
  'about',
  'repayment',
  'insurance-attestation',
  'relocation'
] as const satisfies readonly Tab[]

/** Labels for home tiles and sidebar tooltips (single source of truth). */
export const PANEL_IDENTITY: Partial<Record<Tab, PanelIdentity>> = {
  chat: {
    icon: Bot,
    label: 'Discuter'
  },
  tickets: {
    icon: MessageSquareReply,
    label: 'Répondre aux locataires'
  },
  about: {
    icon: Activity,
    label: 'Synthétiser une histoire'
  },
  repayment: {
    icon: PiggyBank,
    label: "Préfigurer un plan d'apurement"
  },
  'insurance-attestation': {
    icon: ShieldCheck,
    label: 'Renouveler les assurances-habitation'
  },
  relocation: {
    icon: ArrowRightLeft,
    label: 'Piloter la relocation'
  },
  automations: {
    icon: CalendarSync,
    label: 'Consulter les vigies et routines'
  },
  updates: {
    icon: Newspaper,
    label: 'Mises à jour'
  }
}
