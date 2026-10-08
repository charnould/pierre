'use client'

import { cn } from 'cn'
import * as React from 'react'

function Table({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<'table'> & { containerClassName?: string }) {
  return (
    <div
      data-slot="table-container"
      className={cn('relative w-full overflow-x-auto bg-transparent', containerClassName)}
    >
      <table
        data-slot="table"
        className={cn('text-table w-full caption-bottom tabular-nums', className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={className} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={className} {...props} />
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  )
}

function TableRow({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'tr'> & {
  variant?: 'default' | 'board'
}) {
  return (
    <tr
      data-slot="table-row"
      data-variant={variant === 'board' ? 'board' : undefined}
      className={cn(
        'hover:bg-muted/50 has-aria-expanded:bg-muted data-[state=selected]:bg-muted transition-colors',
        variant === 'board' &&
          'focus-visible:ring-ring/20 data-checked:bg-muted/50 cursor-pointer focus-visible:ring-2 focus-visible:outline-none',
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
}: React.ComponentProps<'th'> & {
  variant?: 'default' | 'board'
}) {
  return (
    <th
      scope="col"
      data-slot="table-head"
      data-variant={variant === 'board' ? 'board' : undefined}
      className={cn(
        'text-muted-foreground px-2 text-left align-middle font-semibold whitespace-nowrap [&:has([role=checkbox])]:pr-0',
        variant === 'board' ? 'h-8 font-mono text-[11px] leading-4' : 'h-7 text-[12px] leading-4',
        className
      )}
      {...props}
    />
  )
}

function TableCell({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'td'> & {
  variant?: 'default' | 'board'
}) {
  return (
    <td
      data-slot="table-cell"
      data-variant={variant === 'board' ? 'board' : undefined}
      className={cn(
        'px-2 align-middle [&:has([role=checkbox])]:pr-0',
        variant === 'board'
          ? 'h-8 py-0 font-sans text-[13px] leading-5 whitespace-nowrap'
          : 'h-10 py-1 whitespace-normal',
        className
      )}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('text-muted-foreground mt-4 text-xs leading-4', className)}
      {...props}
    />
  )
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
