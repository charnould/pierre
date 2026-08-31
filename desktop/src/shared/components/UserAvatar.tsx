import { useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage, type AvatarSize } from '@/shared/components/ui/avatar'
import { avatarInitials, avatarTone } from '@/shared/lib/avatar/initials'
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
  const tone = avatarTone(login)

  return (
    <Avatar size={size} className={cn('[container-type:size]', className)}>
      {src ? <AvatarImage src={src} alt="" onError={() => setFailedUrl(photoUrl ?? null)} /> : null}
      <AvatarFallback
        className="[font-size:38cqmin] font-medium tracking-tight uppercase"
        style={{ backgroundColor: tone.bg, color: tone.fg }}
      >
        <span aria-hidden>{avatarInitials(login)}</span>
        <span className="sr-only">{name}</span>
      </AvatarFallback>
    </Avatar>
  )
}
