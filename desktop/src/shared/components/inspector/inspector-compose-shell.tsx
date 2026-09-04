import type { LucideIcon } from 'lucide-react'
import { type ReactNode, useId } from 'react'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

interface ShellProps {
  icon: LucideIcon
  title: string
  children: ReactNode
  footer?: ReactNode
  pending?: boolean
  className?: string
  contentClassName?: string
}

export function InspectorComposeShell({
  icon: Icon,
  title,
  children,
  footer,
  pending = false,
  className,
  contentClassName
}: ShellProps) {
  const titleId = useId()

  return (
    <div
      role="group"
      aria-labelledby={titleId}
      aria-busy={pending || undefined}
      data-inspector-compose-shell=""
      className={cn(
        'border-border/60 bg-card rounded-md border px-3 py-3 shadow-none ring-0',
        pending && 'pointer-events-none opacity-70',
        className
      )}
    >
      <div className="flex items-start gap-2">
        <Icon aria-hidden className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <p id={titleId} className="text-sm leading-5 font-medium">
          {title}
        </p>
      </div>
      <div className={cn('mt-3 flex flex-col gap-4', contentClassName)}>{children}</div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  )
}

interface FooterProps {
  onCancel: () => void
  cancelLabel?: string
  pending?: boolean
  extra?: ReactNode
  children: ReactNode
}

export function InspectorComposeFooter({
  onCancel,
  cancelLabel = 'Annuler',
  pending = false,
  extra,
  children
}: FooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {extra ? <div className="me-auto flex flex-wrap gap-2">{extra}</div> : null}
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onCancel}>
        {cancelLabel}
      </Button>
      {children}
    </div>
  )
}
