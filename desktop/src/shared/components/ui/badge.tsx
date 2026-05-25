import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/shared/lib/utils'

const badgeVariants = cva(
  'group/badge inline-flex w-fit shrink-0 items-center justify-center overflow-hidden rounded-4xl border border-transparent whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        secondary: 'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        destructive:
          'bg-destructive/10 text-destructive focus-visible:ring-destructive/20 [a]:hover:bg-destructive/20',
        outline: 'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
        ghost: 'hover:bg-muted hover:text-muted-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        success: 'bg-success-soft text-success-soft-foreground [a]:hover:bg-success-soft/80',
        warning: 'bg-warning-soft text-warning-soft-foreground [a]:hover:bg-warning-soft/80',
        danger: 'bg-danger-soft text-danger-soft-foreground [a]:hover:bg-danger-soft/80',
        info: 'bg-info-soft text-info-soft-foreground [a]:hover:bg-info-soft/80',
        neutral: 'bg-neutral-soft text-neutral-soft-foreground [a]:hover:bg-neutral-soft/80'
      },
      size: {
        default:
          'h-5 gap-1 px-2 py-0.5 text-xs font-medium has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg:not([class*="size-"])]:size-3!',
        compact:
          'h-[17px] gap-1 px-1.5 text-[10px] font-semibold shadow-[var(--elevation-pill-inset)] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg:not([class*="size-"])]:size-2.5!'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

function Badge({
  className,
  variant = 'default',
  size = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant, size }), className)
      },
      props
    ),
    render,
    state: {
      slot: 'badge',
      variant,
      size
    }
  })
}

export { Badge, badgeVariants }
