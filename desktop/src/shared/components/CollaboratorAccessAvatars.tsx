import { AvatarGroup, AvatarGroupCount } from '@/shared/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { useUserAvatar } from '@/shared/hooks/useUserAvatar'
import {
  formatOrgCollaboratorLabel,
  resolveOrgUserByLoginOrEmail
} from '@/shared/lib/org-users-cache'

const MAX_COLLABORATOR_AVATARS = 10

function AccessAvatar({ login }: { login: string }) {
  const avatar = useUserAvatar(login)
  const label = formatOrgCollaboratorLabel(login)

  return (
    <Tooltip>
      <TooltipTrigger
        render={<UserAvatar photoUrl={avatar} name={label} login={login} size="sm" />}
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function collaboratorIdentityKey(raw: string): string {
  const user = resolveOrgUserByLoginOrEmail(raw)
  return (user?.email || user?.login || raw).trim().toLowerCase()
}

function uniqueMentions(owner: string, mentions: readonly string[]): string[] {
  const seen = new Set<string>([collaboratorIdentityKey(owner)])
  const result: string[] = []
  for (const mention of mentions) {
    const key = collaboratorIdentityKey(mention)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(mention)
  }
  return result
}

export function CollaboratorAccessAvatars({
  owner,
  mentions
}: {
  owner: string
  mentions: readonly string[]
}) {
  const collaborators = uniqueMentions(owner, mentions)
  const visible = collaborators.slice(0, MAX_COLLABORATOR_AVATARS)
  const hidden = collaborators.slice(MAX_COLLABORATOR_AVATARS)
  const ownerLabel = formatOrgCollaboratorLabel(owner)
  const label =
    collaborators.length === 0
      ? `Accès : ${ownerLabel}`
      : `Accès : ${ownerLabel} et ${collaborators.map((login) => formatOrgCollaboratorLabel(login)).join(', ')}`

  if (collaborators.length === 0) {
    return (
      <span aria-label={label} className="justify-self-start">
        <AccessAvatar login={owner} />
      </span>
    )
  }

  return (
    <span aria-label={label} className="flex items-center justify-self-start">
      <AccessAvatar login={owner} />
      <span className="text-muted-foreground px-0.5 text-xs" aria-hidden>
        +
      </span>
      <AvatarGroup>
        {visible.map((login) => (
          <AccessAvatar key={login} login={login} />
        ))}
        {hidden.length > 0 ? (
          <Tooltip>
            <TooltipTrigger render={<AvatarGroupCount>+{hidden.length}</AvatarGroupCount>} />
            <TooltipContent>
              {hidden.map((login) => formatOrgCollaboratorLabel(login)).join(', ')}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </AvatarGroup>
    </span>
  )
}
