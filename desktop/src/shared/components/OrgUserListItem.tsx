import { UserAvatar } from '@/shared/components/UserAvatar'
import { useUserAvatar } from '@/shared/hooks/useUserAvatar'
import { orgUserListFields } from '@/shared/lib/org-user-list-item'
import { cn } from '@/shared/lib/utils'
import type { OrgUser } from '@/shared/types/users'

type Props = {
  className?: string
  user?: OrgUser
  photoUrl?: string | null
  name?: string
  login?: string
}

/** Picker-list identity: avatar + name (L1) + login (L2). Always both lines. */
export function OrgUserListItem({ user, photoUrl, name, login, className }: Props) {
  const fields = user
    ? orgUserListFields(user)
    : { photoUrl: photoUrl ?? null, name: name ?? '', login: login ?? '' }
  const livePhoto = useUserAvatar(fields.login)

  return (
    <span className={cn('flex min-w-0 items-center gap-2', className)}>
      <UserAvatar
        photoUrl={livePhoto ?? fields.photoUrl}
        name={fields.name}
        login={fields.login}
        size="sm"
      />
      <span className="flex min-w-0 flex-col items-start">
        <span className="truncate font-medium">{fields.name}</span>
        <span className="text-muted-foreground truncate text-xs">{fields.login}</span>
      </span>
    </span>
  )
}
