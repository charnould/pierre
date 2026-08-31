import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select'
import type { ChatBootData } from '@/shared/types'

interface Props {
  configs: ChatBootData['displayableConfigs']
  activeId: string
  agentName: string
  onSelect: (id: string) => void
  disabled?: boolean
}

export function ProfileSelector({ configs, activeId, agentName, onSelect, disabled }: Props) {
  if (configs.length === 0) return null

  return (
    <Select
      items={configs.map((config) => ({ label: config.display, value: config.id }))}
      value={activeId}
      disabled={disabled}
      onValueChange={(next) => {
        if (typeof next === 'string' && next !== activeId) onSelect(next)
      }}
    >
      <SelectTrigger aria-label={`Profil de ${agentName}`} size="sm" className="bg-transparent">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          {configs.map((config) => (
            <SelectItem key={config.id} value={config.id}>
              {config.display}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
