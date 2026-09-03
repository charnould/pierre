import { BookMarked, Globe, Home, UserPlus } from 'lucide-react'
import type { ReactNode } from 'react'

import { useResolvedUiSettings } from '@/contexts/UiSettingsContext'
import { MascotSvg } from '@/mascot/MascotSvg'
import { Avatar, AvatarFallback, type AvatarSize } from '@/shared/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { useUserAvatar } from '@/shared/hooks/useUserAvatar'
import { resolveOrgUser } from '@/shared/lib/org-users-cache'
import {
  type ParsedActivityAuthor,
  type TimelineActorKind
} from '@/shared/lib/timeline/parse-activity-author'
import { resolveMascotSettings } from '@/shared/lib/ui-settings/schema'
import { cn } from '@/shared/lib/utils'

function actorFallback(kind: TimelineActorKind, icon: ReactNode): ReactNode {
  switch (kind) {
    case 'agent':
    case 'automation':
    case 'system':
      return <AvatarFallback tone="timeline-bot">{icon}</AvatarFallback>
    case 'database':
      return <AvatarFallback tone="timeline-database">{icon}</AvatarFallback>
    case 'user':
      return <AvatarFallback tone="timeline-user">{icon}</AvatarFallback>
    case 'tenant':
      return <AvatarFallback tone="timeline-tenant">{icon}</AvatarFallback>
    case 'external':
      return <AvatarFallback tone="timeline-external">{icon}</AvatarFallback>
    case 'candidate':
      return <AvatarFallback tone="timeline-candidate">{icon}</AvatarFallback>
    case 'unknown':
      return <AvatarFallback tone="timeline-user">{icon}</AvatarFallback>
  }
}

function isPierreKind(kind: TimelineActorKind): boolean {
  return kind === 'agent' || kind === 'automation' || kind === 'system'
}

function iconForKind(kind: TimelineActorKind, size: AvatarSize): ReactNode | null {
  const iconClass = size === 'xs' ? 'size-2.5' : size === 'sm' ? 'size-3' : 'size-4'
  switch (kind) {
    case 'database':
      return <BookMarked className={iconClass} aria-hidden />
    case 'tenant':
      return <Home className={iconClass} aria-hidden />
    case 'external':
      return <Globe className={iconClass} aria-hidden />
    case 'candidate':
      return <UserPlus className={iconClass} aria-hidden />
    default:
      return null
  }
}

/** Full identity for avatar tooltip / aria. */
export function actorDisplayName(actor: ParsedActivityAuthor): string {
  if (actor.kind === 'user' || actor.kind === 'unknown') {
    const org = resolveOrgUser(actor.id || actor.label)
    if (org?.displayName?.trim()) return org.displayName.trim()
    if (org?.email) return org.email
  }
  const label = actor.label.trim() || actor.id.trim()
  return label || 'Inconnu'
}

interface Props {
  actor: ParsedActivityAuthor
  className?: string
  size?: AvatarSize
}

export function AgentAvatar({
  size = 'default',
  className
}: {
  size?: AvatarSize
  className?: string
}) {
  const color = resolveMascotSettings(useResolvedUiSettings()).color
  return (
    <Avatar size={size} className={className}>
      <MascotSvg shape="cercle" color={color} fit="body" className="size-full" />
    </Avatar>
  )
}

export function TimelineActorAvatar({ actor, className, size = 'default' }: Props) {
  const icon = iconForKind(actor.kind, size)
  const lookupLogin = actor.kind === 'user' || actor.kind === 'unknown' ? actor.id : undefined
  const avatar = useUserAvatar(lookupLogin)
  const displayName = actorDisplayName(actor)
  const hitSize =
    size === 'lg' ? 'size-10' : size === 'sm' ? 'size-6' : size === 'xs' ? 'size-4' : 'size-8'

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              'focus-visible:ring-ring/40 inline-flex shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-1',
              hitSize
            )}
          />
        }
        aria-label={displayName}
      >
        {isPierreKind(actor.kind) ? (
          <AgentAvatar size={size} className={className} />
        ) : lookupLogin ? (
          <UserAvatar
            photoUrl={avatar}
            name={displayName}
            login={lookupLogin}
            size={size}
            className={className}
          />
        ) : (
          <Avatar size={size} className={className}>
            {actorFallback(actor.kind, icon)}
          </Avatar>
        )}
      </TooltipTrigger>
      <TooltipContent side="right">{displayName}</TooltipContent>
    </Tooltip>
  )
}
