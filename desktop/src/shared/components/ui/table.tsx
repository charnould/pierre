import { cn } from 'cn'
import * as React from 'react'

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

function TableRow({
  className,
  hover = true,
  ...props
}: React.ComponentProps<'tr'> & { hover?: boolean }) {
  return (
    <tr
      data-slot="table-row"
      data-hover={hover}
      className={cn(
        'border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted data-[hover=false]:hover:bg-transparent',
        className
      )}
      {...props}
    />
  )
}

function TableHead({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'th'> & { variant?: 'default' | 'board' }) {
  return (
    <th
      data-slot="table-head"
      data-variant={variant}
      className={cn(
        'h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 data-[variant=board]:border-b data-[variant=board]:border-border data-[variant=board]:bg-background',
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn('p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0', className)}
      {...props}
    />
  )
}

export { TableHeader, TableBody, TableHead, TableRow, TableCell }
