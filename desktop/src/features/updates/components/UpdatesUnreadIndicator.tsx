import { motion } from 'motion/react'

import { SidebarMenuBadge } from '@/shared/components/ui/sidebar'
import { cn } from '@/shared/lib/utils'

interface Props {
  count: number
  part: 'dot' | 'badge'
}

const springIn = { type: 'spring' as const, stiffness: 520, damping: 28, mass: 0.7 }

const MotionSidebarMenuBadge = motion.create(SidebarMenuBadge)

export function UpdatesUnreadIndicator({ count, part }: Props) {
  if (count <= 0) return null

  if (part === 'dot') {
    return (
      <motion.span
        aria-hidden
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springIn}
        className={cn(
          'updates-unread-dot',
          'absolute -top-0.5 -right-0.5 hidden size-2.5 rounded-full group-data-[collapsible=icon]:block'
        )}
      />
    )
  }

  const label = count > 9 ? '9+' : String(count)

  return (
    <MotionSidebarMenuBadge
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="updates-unread-badge"
    >
      {label}
    </MotionSidebarMenuBadge>
  )
}
