import { UpdatesUnreadIndicator } from '@/features/updates/components/UpdatesUnreadIndicator'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from '@/shared/components/ui/sidebar'
import { buildNavItems, buildSettingsNavItem, buildUpdatesNavItem } from '@/shared/lib/nav-items'
import type { Tab } from '@/shared/lib/tabs'
import { cn } from '@/shared/lib/utils'

interface Props {
  activeTab: Tab
  isLoggedIn: boolean
  onTabChange: (tab: Tab) => void
  agentName: string
  updatesUnreadCount?: number
}

function blurSidebarButton(event: React.MouseEvent<HTMLButtonElement>) {
  event.currentTarget.blur()
}

export function AppSidebar({
  activeTab,
  isLoggedIn,
  onTabChange,
  agentName,
  updatesUnreadCount = 0
}: Props) {
  const navItems = buildNavItems(agentName)
  const updatesItem = buildUpdatesNavItem()
  const settingsItem = buildSettingsNavItem()
  const UpdatesIcon = updatesItem.icon
  const SettingsIcon = settingsItem.icon

  return (
    <Sidebar collapsible="icon" variant="floating" className="no-drag">
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
      <SidebarFooter className="gap-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeTab === 'updates'}
              className={cn(
                'relative',
                updatesUnreadCount > 0 && 'pr-7 group-data-[collapsible=icon]:p-2!'
              )}
              tooltip={updatesItem.label}
              onClick={(event) => {
                blurSidebarButton(event)
                onTabChange('updates')
              }}
            >
              <span className="relative flex size-4 shrink-0 items-center justify-center">
                <UpdatesIcon />
                <UpdatesUnreadIndicator count={updatesUnreadCount} part="dot" />
              </span>
              <span>{updatesItem.label}</span>
            </SidebarMenuButton>
            <UpdatesUnreadIndicator count={updatesUnreadCount} part="badge" />
          </SidebarMenuItem>
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
      <SidebarRail />
    </Sidebar>
  )
}
