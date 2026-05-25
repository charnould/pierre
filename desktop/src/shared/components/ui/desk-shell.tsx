import type { ComponentProps } from 'react'

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@/shared/components/ui/resizable'
import { getAppPlatform, shellTopClass } from '@/shared/lib/platform'
import { cn } from '@/shared/lib/utils'

export function DeskShell({ className, children, ...props }: ComponentProps<'div'>) {
  const platform = getAppPlatform()
  return (
    <div
      className={cn('flex min-h-0 flex-1 flex-col', shellTopClass(platform), className)}
      {...props}
    >
      {children}
    </div>
  )
}

/** Gouttières droite + bas (panneau plein ou colonne split). */
export function DeskContent({ className, children, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col pr-4 pb-3', className)} {...props}>
      {children}
    </div>
  )
}

export function DeskSplit({
  className,
  children,
  ...props
}: ComponentProps<typeof ResizablePanelGroup>) {
  return (
    <ResizablePanelGroup className={cn('h-full min-h-0 flex-1', className)} {...props}>
      {children}
    </ResizablePanelGroup>
  )
}

export function DeskPane({ className, children, ...props }: ComponentProps<typeof ResizablePanel>) {
  return (
    <ResizablePanel
      className={cn('flex h-full min-h-0 min-w-0 flex-col overflow-hidden pr-4 pb-3', className)}
      {...props}
    >
      {children}
    </ResizablePanel>
  )
}

export function DeskHandle({ className, ...props }: ComponentProps<typeof ResizableHandle>) {
  return (
    <ResizableHandle
      withHandle
      className={cn(
        'relative z-20 !w-0 min-w-0 shrink-0 grow-0 border-0 bg-transparent p-0 shadow-none',
        'after:hidden before:hidden',
        '[&>div]:absolute [&>div]:top-1/2 [&>div]:left-0 [&>div]:z-1 [&>div]:flex [&>div]:h-4 [&>div]:w-3 [&>div]:-translate-x-1/2 [&>div]:-translate-y-1/2 [&>div]:items-center [&>div]:justify-center [&>div]:rounded-lg [&>div]:border [&>div]:border-border [&>div]:bg-card [&>div]:shadow-chrome',
        '[&>div_svg]:h-2.5 [&>div_svg]:w-2.5 [&>div_svg]:text-muted-foreground',
        className
      )}
      {...props}
    />
  )
}
