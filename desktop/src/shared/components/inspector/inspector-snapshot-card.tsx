import { Box, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card, CardContent } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'

export function InspectorSnapshotFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <span>{label}</span>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">{children}</div>
    </>
  )
}

export function InspectorSnapshotCard({
  children,
  className,
  icon: Icon = Box,
  title = 'Contexte'
}: {
  children: ReactNode
  className?: string
  icon?: LucideIcon
  title?: string
}) {
  return (
    <Card
      size="sm"
      className={cn('border-border w-full gap-0 rounded-md border py-0 ring-0', className)}
    >
      <CardContent className="px-3 py-2">
        <div className="flex min-w-0 items-start gap-2">
          <Icon aria-hidden className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-foreground m-0 text-sm leading-5 font-medium">{title}</p>
            <div className="text-muted-foreground mt-2 grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-1.5 gap-y-1 text-xs leading-4">
              {children}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
