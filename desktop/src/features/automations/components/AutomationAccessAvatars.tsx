import { AvatarGroup, AvatarGroupCount } from '@/shared/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { useUserAvatar } from '@/shared/hooks/useUserAvatar'
import { formatOrgCollaboratorLabel } from '@/shared/lib/org-users-cache'

import { accessText, collaboratorLogins } from '../lib/automation-list-display'
import type { Automation } from '../lib/automation-types'

const MAX_COLLABORATOR_AVATARS = 10

function AccessAvatar({ login }: { login: string }) {
  const avatar = useUserAvatar(login)
  const label = formatOrgCollaboratorLabel(login)

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <UserAvatar
            photoUrl={avatar}
            name={label}
            login={login}
            size="sm"
            className="ring-background ring-2"
          />
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function AutomationAccessAvatars({ automation }: { automation: Automation }) {
  const collaborators = collaboratorLogins(automation)
  const visible = collaborators.slice(0, MAX_COLLABORATOR_AVATARS)
  const hidden = collaborators.slice(MAX_COLLABORATOR_AVATARS)
  const label = accessText(automation)

  if (collaborators.length === 0) {
    return (
      <span aria-label={label} className="justify-self-start">
        <AccessAvatar login={automation.owner} />
      </span>
    )
  }

  return (
    <span aria-label={label} className="flex items-center justify-self-start">
      <AccessAvatar login={automation.owner} />
      <span className="text-muted-foreground px-0.5 text-xs" aria-hidden>
        +
      </span>
      <AvatarGroup className="-space-x-1">
        {visible.map((login) => (
          <AccessAvatar key={login} login={login} />
        ))}
        {hidden.length > 0 ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <AvatarGroupCount className="size-6 text-[0.625rem]">
                  +{hidden.length}
                </AvatarGroupCount>
              }
            />
            <TooltipContent>
              {hidden.map((login) => formatOrgCollaboratorLabel(login)).join(', ')}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </AvatarGroup>
    </span>
  )
}
