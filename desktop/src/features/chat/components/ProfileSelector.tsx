import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { cn } from '@/shared/lib/utils'
import type { ChatBootData } from '@/shared/types'

import { CHAT_COMPOSER_PROFILE_TAB_CLASS } from './chat-utils'

interface Props {
  configs: ChatBootData['displayableConfigs']
  activeId: string
  onSelect: (id: string) => void
  disabled?: boolean
}

export function ProfileSelector({ configs, activeId, onSelect, disabled }: Props) {
  if (configs.length === 0) return null

  if (configs.length === 1) {
    return (
      <span className="bg-sidebar-accent text-sidebar-accent-foreground flex h-7 min-w-0 items-center truncate rounded-md px-2 text-xs font-medium">
        {configs[0].display}
      </span>
    )
  }

  return (
    <Tabs
      value={activeId}
      onValueChange={(value) => {
        if (!disabled && value !== activeId) onSelect(value)
      }}
      className="flex min-w-0 flex-row items-center gap-0"
    >
      <TabsList
        aria-label="Profil du chatbot"
        className={cn(
          'h-auto max-w-full items-center gap-1 overflow-x-auto rounded-md border-0 bg-transparent p-0 shadow-none',
          disabled && 'pointer-events-none opacity-60'
        )}
      >
        {configs.map((config) => (
          <TabsTrigger
            key={config.id}
            value={config.id}
            disabled={disabled && config.id !== activeId}
            className={cn(
              CHAT_COMPOSER_PROFILE_TAB_CLASS,
              'h-7 shrink-0 px-2 py-0 text-xs leading-none font-normal'
            )}
          >
            {config.display}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
