import { cn } from '@/lib/utils'

import type { ChatBootData } from '../../types'

interface Props {
  configs: ChatBootData['displayableConfigs']
  activeId: string
  onSelect: (id: string) => void
  disabled?: boolean
}

const pillBase =
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs leading-snug transition-colors'

const pillActive = 'cursor-default border-border bg-muted font-medium text-foreground'

const pillInactive =
  'cursor-pointer border-border text-muted-foreground hover:border-ring/30 hover:bg-muted hover:text-foreground'

export function ProfileSelector({ configs, activeId, onSelect, disabled }: Props) {
  if (configs.length === 0) return null

  if (configs.length === 1) {
    const only = configs[0]
    return (
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        <span className={cn(pillBase, pillActive)}>{only.display}</span>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
      {configs.map((config) => {
        const isActive = config.id === activeId
        return (
          <button
            key={config.id}
            type="button"
            disabled={disabled && !isActive}
            aria-current={isActive ? 'true' : undefined}
            onClick={() => {
              if (!isActive && !disabled) onSelect(config.id)
            }}
            className={cn(
              pillBase,
              isActive ? pillActive : pillInactive,
              disabled && !isActive && 'pointer-events-none opacity-55'
            )}
          >
            {config.display}
          </button>
        )
      })}
    </div>
  )
}
