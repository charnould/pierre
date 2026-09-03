import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar'
import { cn } from 'cn'
import * as React from 'react'

export type AvatarSize = 'xs' | 'sm' | 'default' | 'lg'
type AvatarFallbackTone =
  | 'default'
  | 'user-initials'
  | 'timeline-bot'
  | 'timeline-database'
  | 'timeline-user'
  | 'timeline-tenant'
  | 'timeline-external'
  | 'timeline-candidate'

function Avatar({
  className,
  size = 'default',
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: AvatarSize
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        'group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full select-none after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:border after:border-border data-[size=lg]:size-10 data-[size=sm]:size-6 data-[size=xs]:size-4',
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('aspect-square size-full rounded-full object-cover', className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  tone = 'default',
  ...props
}: AvatarPrimitive.Fallback.Props & { tone?: AvatarFallbackTone }) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      data-tone={tone}
      className={cn(
        'flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs group-data-[size=xs]/avatar:text-[0.5rem] data-[tone=user-initials]:text-[38cqmin] data-[tone=user-initials]:font-medium data-[tone=user-initials]:tracking-tight data-[tone=user-initials]:uppercase data-[tone=timeline-bot]:bg-timeline-bot data-[tone=timeline-bot]:text-timeline-bot-foreground data-[tone=timeline-database]:bg-timeline-database data-[tone=timeline-database]:text-timeline-database-foreground data-[tone=timeline-user]:bg-timeline-user data-[tone=timeline-user]:text-timeline-user-foreground data-[tone=timeline-tenant]:bg-timeline-tenant data-[tone=timeline-tenant]:text-timeline-tenant-foreground data-[tone=timeline-external]:bg-timeline-external data-[tone=timeline-external]:text-timeline-external-foreground data-[tone=timeline-candidate]:bg-timeline-candidate data-[tone=timeline-candidate]:text-timeline-candidate-foreground',
        className
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        'group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background',
        className
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        'relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3',
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarGroupCount }
