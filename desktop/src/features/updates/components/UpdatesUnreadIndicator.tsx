import { Badge } from '@/shared/components/ui/badge'
import { SidebarMenuBadge } from '@/shared/components/ui/sidebar'

interface Props {
  count: number
}

/** Numeric unread badge for the expanded sidebar notifications row. */
export function UpdatesUnreadIndicator({ count }: Props) {
  const label = count > 9 ? '9+' : String(count)

  return (
    <SidebarMenuBadge
      aria-hidden={count <= 0}
      data-visible={count > 0 ? '' : undefined}
      className="updates-unread-indicator bg-transparent p-0"
    >
      <Badge className="bg-unread text-unread-foreground tabular-nums">{label}</Badge>
    </SidebarMenuBadge>
  )
}
