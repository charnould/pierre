import { Calculator, FileSearch, MessageSquare, Reply } from 'lucide-react'
import type { ComponentType } from 'react'

import type { Tab } from './tabs'

export interface PanelIdentity {
  gradient: string
  color: string
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
  label: string
}

/** Labels for home tiles and sidebar tooltips (single source of truth). */
export const PANEL_IDENTITY: Partial<Record<Tab, PanelIdentity>> = {
  chat: {
    color: '#FFE000',
    gradient: 'linear-gradient(145deg, #FFE000 0%, #799F0C 100%)',
    icon: MessageSquare,
    label: 'Discuter'
  },
  request: {
    color: '#FF512F',
    gradient: 'linear-gradient(145deg, #FF512F 0%, #DD2476 100%)',
    icon: Reply,
    label: 'Répondre à un locataire'
  },
  about: {
    color: '#34C759',
    gradient: 'linear-gradient(145deg, #34C759 0%, #30B0C7 100%)',
    icon: FileSearch,
    label: 'Obtenir une synthèse locataire ou patrimoine'
  },
  repayment: {
    color: '#1488CC',
    gradient: 'linear-gradient(145deg, #1488CC 0%, #2B32B2 100%)',
    icon: Calculator,
    label: "Préfigurer un plan d'apurement"
  }
}
