import { ChevronDown } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu'
import { InputGroupButton } from '@/shared/components/ui/input-group'
import type { ChatBoot } from '@/shared/types'

interface Props {
  configs: ChatBoot['displayableConfigs']
  activeId: string
  agentName: string
  onSelect: (id: string) => void
  disabled?: boolean
}

export function ProfileSelector({ configs, activeId, agentName, onSelect, disabled }: Props) {
  const active = configs.find((config) => config.id === activeId) ?? configs[0]
  if (!active) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <InputGroupButton
            type="button"
            variant="outline"
            size="sm"
            className="text-muted-foreground font-normal"
            aria-label={`Profil de ${agentName}`}
            disabled={disabled}
          />
        }
      >
        {active.display}
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-max min-w-36">
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup
            value={active.id}
            onValueChange={(next) => {
              if (next !== active.id) onSelect(next)
            }}
          >
            {configs.map((config) => (
              <DropdownMenuRadioItem key={config.id} value={config.id}>
                {config.display}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
