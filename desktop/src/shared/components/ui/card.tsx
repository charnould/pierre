import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { CHROME_SHELL_CLASS, REPORT_SHELL_CLASS } from '@/shared/lib/chrome-shell'
import { cn } from '@/shared/lib/utils'

const cardVariants = cva('relative text-card-foreground', {
  variants: {
    variant: {
      default: 'overflow-hidden rounded-lg border border-border bg-card',
      chrome: cn('bg-card text-card-foreground', CHROME_SHELL_CLASS),
      selected:
        'overflow-hidden rounded-lg border border-border bg-accent shadow-sm ring-1 ring-border/50',
      report: cn('overflow-hidden bg-report text-card-foreground', REPORT_SHELL_CLASS)
    },
    interactive: {
      true: 'cursor-pointer',
      false: ''
    }
  },
  defaultVariants: {
    variant: 'default',
    interactive: false
  }
})

function Card({
  className,
  variant = 'default',
  interactive = false,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(cardVariants({ variant, interactive }), className)}
      {...props}
    />
  )
}

const cardHeaderVariants = cva(
  'box-border flex min-h-10 items-center justify-between gap-3 border-b border-border/40 py-2.5',
  {
    variants: {
      inset: {
        default: 'px-3',
        report: 'gap-0 border-b-0 p-0',
        chrome: 'gap-0 border-b-0 p-0'
      },
      tone: {
        idle: '',
        active: ''
      }
    },
    defaultVariants: {
      inset: 'default',
      tone: 'idle'
    }
  }
)

function CardHeader({
  className,
  inset = 'default',
  tone = 'idle',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof cardHeaderVariants>) {
  return (
    <div
      data-slot="card-header"
      className={cn(cardHeaderVariants({ inset, tone }), className)}
      {...props}
    />
  )
}

function CardTitle({
  className,
  tone = 'idle',
  ...props
}: React.ComponentProps<'h3'> & { tone?: 'idle' | 'active' }) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        'm-0 min-w-0 flex-1 text-balance text-sm leading-5 font-medium',
        tone === 'active' ? 'text-foreground' : 'text-muted-foreground',
        className
      )}
      {...props}
    />
  )
}

function CardRule({ className, ...props }: React.ComponentProps<'hr'>) {
  return (
    <hr
      data-slot="card-rule"
      aria-hidden
      className={cn('m-0 border-0 border-b border-border/40 p-0', className)}
      {...props}
    />
  )
}

const cardBodyVariants = cva('flex flex-col', {
  variants: {
    inset: {
      default: 'gap-3 p-3',
      report: 'gap-0 p-0',
      chrome: 'gap-0 p-0'
    }
  },
  defaultVariants: {
    inset: 'default'
  }
})

function CardBody({
  className,
  inset = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof cardBodyVariants>) {
  return (
    <div data-slot="card-body" className={cn(cardBodyVariants({ inset }), className)} {...props} />
  )
}

const cardFooterVariants = cva('flex items-center border-t border-border/40', {
  variants: {
    inset: {
      default: 'gap-3 p-3',
      report: 'gap-0 p-0',
      chrome: 'gap-0 p-0'
    }
  },
  defaultVariants: {
    inset: 'default'
  }
})

function CardFooter({
  className,
  inset = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof cardFooterVariants>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(cardFooterVariants({ inset }), className)}
      {...props}
    />
  )
}

export {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardRule,
  CardTitle,
  cardBodyVariants,
  cardFooterVariants,
  cardHeaderVariants,
  cardVariants
}
