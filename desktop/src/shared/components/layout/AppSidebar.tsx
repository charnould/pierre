import { ActivityNotificationsTrigger } from '@/features/activity/components/ActivityNotificationsTrigger'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/shared/components/ui/sidebar'
import { buildNavItems, buildSettingsNavItem } from '@/shared/lib/nav-items'
import { preloadTab } from '@/shared/lib/preload-tab'
import type { Tab } from '@/shared/lib/tabs'

interface Props {
  activeTab: Tab
  isLoggedIn: boolean
  onTabChange: (tab: Tab) => void
  agentName: string
  unreadCount: number
}

function blurSidebarButton(event: React.MouseEvent<HTMLButtonElement>) {
  event.currentTarget.blur()
}

export function AppSidebar({ activeTab, isLoggedIn, onTabChange, agentName, unreadCount }: Props) {
  const navItems = buildNavItems(agentName)
  const settingsItem = buildSettingsNavItem()
  const SettingsIcon = settingsItem.icon

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="no-drag">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ id, label, icon: Icon }) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton
                    isActive={activeTab === id}
                    disabled={!isLoggedIn}
                    tooltip={label}
                    onPointerEnter={() => preloadTab(id)}
                    onClick={(event) => {
                      blurSidebarButton(event)
                      if (isLoggedIn) onTabChange(id)
                    }}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <ActivityNotificationsTrigger unreadCount={unreadCount} disabled={!isLoggedIn} />
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeTab === 'settings'}
              tooltip={settingsItem.label}
              onClick={(event) => {
                blurSidebarButton(event)
                onTabChange('settings')
              }}
            >
              <SettingsIcon />
              <span>{settingsItem.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
