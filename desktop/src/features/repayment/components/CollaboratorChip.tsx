import type { CSSProperties } from 'react'

import { useAgentIdentity } from '@/contexts/AgentIdentityContext'
import { AgentAvatar } from '@/shared/components/timeline/timeline-actor-avatar'
import { Badge } from '@/shared/components/ui/badge'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { useUserAvatar } from '@/shared/hooks/useUserAvatar'
import { cn } from '@/shared/lib/utils'

import { isDesktopAgentIdentity } from '../../../../../shared/agent-identity'
import { formatMentionDisplay } from '../lib/repayment-mention'

interface Props {
  /** Login or email — resolved to org displayName, else capitalized login. */
  identity: string
  /** h-4 — notification rail mentions. Default h-5 matches colorize chips. */
  compact?: boolean
  title?: string
  className?: string
  style?: CSSProperties
}

/** Identity chip: avatar + name, same anatomy as comment mentions. */
export function CollaboratorChip({ identity, compact = false, title, className, style }: Props) {
  const agent = useAgentIdentity()
  const isAgent = isDesktopAgentIdentity(identity, agent.name)
  const avatar = useUserAvatar(isAgent ? undefined : identity)
  const name = isAgent ? agent.name : formatMentionDisplay(identity)

  return (
    <Badge
      variant="secondary"
      title={title}
      style={style}
      className={cn(
        'max-w-full min-w-0 gap-1 overflow-hidden px-0 ps-px align-middle leading-none',
        compact ? 'h-4 py-0 pe-1' : 'h-5 pe-1.5',
        className
      )}
    >
      {isAgent ? (
        <AgentAvatar
          size="xs"
          className={cn('aspect-square shrink-0', compact ? 'size-3!' : 'size-3.5!')}
        />
      ) : (
        <UserAvatar
          photoUrl={avatar}
          name={name}
          login={identity}
          size="sm"
          className={cn('aspect-square shrink-0', compact ? 'size-3!' : 'size-3.5!')}
        />
      )}
      <span className="truncate">{name}</span>
    </Badge>
  )
}
