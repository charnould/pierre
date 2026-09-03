import { useAgentIdentity } from '@/contexts/AgentIdentityContext'
import { AgentAvatar } from '@/shared/components/timeline/timeline-actor-avatar'
import { Badge, type BadgeAppearance } from '@/shared/components/ui/badge'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { useUserAvatar } from '@/shared/hooks/useUserAvatar'
import { formatMentionDisplay } from '@/shared/lib/activities/mentions'
import { cn } from '@/shared/lib/utils'

import { isDesktopAgentIdentity } from '../../../../../shared/agent-identity'

interface Props {
  /** Login or email — resolved to org displayName, else capitalized login. */
  identity: string
  /** h-4 — notification rail mentions. Default h-5 matches colorize chips. */
  compact?: boolean
  title?: string
  className?: string
  appearance?: BadgeAppearance
}

/** Identity chip: avatar + name, same anatomy as comment mentions. */
export function CollaboratorChip({
  identity,
  compact = false,
  title,
  className,
  appearance
}: Props) {
  const agent = useAgentIdentity()
  const isAgent = isDesktopAgentIdentity(identity, agent.name)
  const avatar = useUserAvatar(isAgent ? undefined : identity)
  const name = isAgent ? agent.name : formatMentionDisplay(identity)

  return (
    <Badge
      variant="secondary"
      size={compact ? 'compact' : 'default'}
      title={title}
      appearance={appearance}
      className={cn(
        'max-w-full min-w-0 gap-1 overflow-hidden px-0 py-0 ps-px pe-1 align-middle leading-none',
        !compact && 'pierre-type-data pe-1.5',
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
