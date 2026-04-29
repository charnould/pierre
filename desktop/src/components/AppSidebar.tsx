import { MessageSquare, PenLine, Settings } from 'lucide-react'

import type { Tab } from '../App'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from './ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

interface Props {
  activeTab: Tab
  isLoggedIn: boolean
  onTabChange: (tab: Tab) => void
}

const NAV_ITEMS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'discuter', label: 'Chatbot', icon: MessageSquare },
  { id: 'repondre', label: 'Générer une réponse', icon: PenLine }
]

export function AppSidebar({ activeTab, isLoggedIn, onTabChange }: Props) {
  return (
    <Sidebar collapsible="none" className="h-full w-12 shrink-0 border-r border-gray-300">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <SidebarMenuItem key={id}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <SidebarMenuButton
                          isActive={activeTab === id}
                          disabled={!isLoggedIn}
                          onClick={() => onTabChange(id)}
                          className={!isLoggedIn ? 'cursor-not-allowed opacity-40' : ''}
                        />
                      }
                    >
                      <Icon className="size-4" />
                      <span className="sr-only">{label}</span>
                    </TooltipTrigger>
                    <TooltipContent side="right">{label}</TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Tooltip>
              <TooltipTrigger
                render={
                  <SidebarMenuButton
                    isActive={activeTab === 'parametres'}
                    onClick={() => onTabChange('parametres')}
                  />
                }
              >
                <Settings className="size-4" />
                <span className="sr-only">Paramètres</span>
              </TooltipTrigger>
              <TooltipContent side="right">Paramètres</TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
