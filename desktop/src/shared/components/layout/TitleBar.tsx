import { FileQuestionMark } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { PANEL_IDENTITY } from '@/shared/lib/panel-identity'
import { preloadTab } from '@/shared/lib/preload-tab'
import type { Tab } from '@/shared/lib/tab-registry'
import { cn } from '@/shared/lib/utils'
import type { UserPrincipal } from '@/shared/types/users'

const USER_MANUAL_URL =
  'https://github.com/charnould/pierre/blob/docs/master/docs/07-user-manual/index.md'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform)

interface Props {
  activeTab: Tab
  user: UserPrincipal | null
  notifications: ReactNode
  tasks: ReactNode
  onTabChange: (tab: Tab) => void
}

function TitleBarTabButton({
  tab,
  active,
  onTabChange
}: {
  tab: 'home' | 'administration' | 'settings'
  active: boolean
  onTabChange: (tab: Tab) => void
}) {
  const identity = PANEL_IDENTITY[tab]
  const Icon = identity.icon

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="no-drag"
            aria-label={identity.label}
            aria-current={active ? 'page' : undefined}
            onPointerEnter={() => preloadTab(tab)}
            onClick={() => onTabChange(tab)}
          />
        }
      >
        <Icon />
      </TooltipTrigger>
      <TooltipContent side="bottom">{identity.label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * One cluster, opposite native window controls (trailing on mac, leading elsewhere).
 */
export function TitleBar({ activeTab, user, notifications, tasks, onTabChange }: Props) {
  return (
    <header
      className="drag bg-background border-border relative z-20 flex h-(--titlebar-height) w-full shrink-0 items-center border-b"
      data-pierre-titlebar=""
    >
      {user ? (
        <div className={cn('flex shrink-0 items-center', isMac && 'ms-auto')}>
          <TitleBarTabButton tab="home" active={activeTab === 'home'} onTabChange={onTabChange} />
          {tasks}
          {notifications}
          <TitleBarTabButton
            tab="settings"
            active={activeTab === 'settings'}
            onTabChange={onTabChange}
          />
          {user.isAdministrator ? (
            <TitleBarTabButton
              tab="administration"
              active={activeTab === 'administration'}
              onTabChange={onTabChange}
            />
          ) : null}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="no-drag"
                  aria-label="Manuel-utilisateur"
                  onClick={() => void window.api.openExternal(USER_MANUAL_URL)}
                />
              }
            >
              <FileQuestionMark />
            </TooltipTrigger>
            <TooltipContent side="bottom">Manuel-utilisateur</TooltipContent>
          </Tooltip>
        </div>
      ) : null}
    </header>
  )
}
