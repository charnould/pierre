import { useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage, type AvatarSize } from '@/shared/components/ui/avatar'
import { avatarInitials, avatarToneIndex } from '@/shared/lib/avatar/initials'
import { cn } from '@/shared/lib/utils'

interface Props {
  photoUrl?: string | null
  name: string
  login: string
  size?: AvatarSize
  className?: string
}

export function UserAvatar({ photoUrl, name, login, size = 'default', className }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const src = photoUrl && failedUrl !== photoUrl ? photoUrl : null

  return (
    <Avatar size={size} className={cn('[container-type:size]', className)}>
      {src ? <AvatarImage src={src} alt="" onError={() => setFailedUrl(photoUrl ?? null)} /> : null}
      <AvatarFallback tone="user-initials" data-avatar-tone={avatarToneIndex(login)}>
        <span aria-hidden>{avatarInitials(login)}</span>
        <span className="sr-only">{name}</span>
      </AvatarFallback>
    </Avatar>
  )
}
