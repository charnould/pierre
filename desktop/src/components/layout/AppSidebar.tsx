import { Calculator, FileSearch, MessageSquare, Reply, Settings, Sparkles } from 'lucide-react'

import type { Tab } from '../../App'
import { REPAYMENT_PLAN_ENABLED } from '../../lib/feature-flags'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '../ui/sidebar'

interface Props {
  activeTab: Tab
  isLoggedIn: boolean
  onTabChange: (tab: Tab) => void
  agentName: string
}

export function AppSidebar({ activeTab, isLoggedIn, onTabChange, agentName }: Props) {
  const NAV_ITEMS: {
    id: Tab
    label: string
    icon: React.ComponentType<{ className?: string }>
    color: string
  }[] = [
    { id: 'home', label: 'Accueil', icon: Sparkles, color: 'currentColor' },
    { id: 'request', label: 'Répondre à un locataire', icon: Reply, color: 'currentColor' },
    ...(REPAYMENT_PLAN_ENABLED
      ? [
          {
            id: 'repayment' as const,
            label: "Préfigurer un plan d'apurement",
            icon: Calculator,
            color: 'currentColor'
          }
        ]
      : []),
    {
      id: 'about',
      label: 'Obtenir une synthèse locataire ou patrimoine',
      icon: FileSearch,
      color: 'currentColor'
    },
    {
      id: 'chat',
      label: `Discuter avec ${agentName}`,
      icon: MessageSquare,
      color: 'currentColor'
    }
  ]
  return (
    <Sidebar variant="floating" collapsible="icon">
      {/* No spacer needed — sidebar starts below titlebar via CSS */}

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ id, label, icon: Icon, color }) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton
                    isActive={activeTab === id}
                    tooltip={{
                      children: label,
                      style: { '--tooltip-bg': color } as React.CSSProperties
                    }}
                    disabled={!isLoggedIn}
                    onClick={() => isLoggedIn && onTabChange(id)}
                    className={!isLoggedIn ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-0">
        <SidebarMenu className="p-0">
          <SidebarMenuItem className="flex h-16 items-center justify-center">
            <SidebarMenuButton
              isActive={activeTab === 'settings'}
              tooltip="Paramètres"
              onClick={() => onTabChange('settings')}
              className="relative mx-auto cursor-pointer"
            >
              <span className="relative inline-flex">
                <Settings className="size-4 shrink-0" />
                <span className="absolute -top-1.5 -right-1.5 flex h-2 w-2">
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${isLoggedIn ? 'bg-[#28c840]' : 'bg-[#FF3B30]'}`}
                  />
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${isLoggedIn ? 'bg-[#28c840]' : 'bg-[#FF3B30]'}`}
                  />
                </span>
              </span>
              <span>Paramètres</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
