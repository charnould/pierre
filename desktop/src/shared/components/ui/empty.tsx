import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

function Empty({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-6 p-8 text-center text-balance',
        className
      )}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-header"
      className={cn('flex max-w-lg flex-col items-center gap-4', className)}
      {...props}
    />
  )
}

const emptyMediaVariants = cva(
  'text-foreground mb-2 flex shrink-0 items-center justify-center bg-transparent [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:[stroke-width:1.5]',
  {
    variants: {
      variant: {
        default: '',
        icon: ''
      },
      size: {
        default: '',
        sm: ''
      }
    },
    compoundVariants: [
      {
        variant: 'icon',
        size: 'default',
        class: "[&_svg:not([class*='size-'])]:size-8"
      },
      {
        variant: 'icon',
        size: 'sm',
        class: "[&_svg:not([class*='size-'])]:size-4"
      }
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

function EmptyMedia({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      data-size={size}
      className={cn(emptyMediaVariants({ variant, size, className }))}
      {...props}
    />
  )
}

const emptyTitleVariants = cva('font-heading font-medium tracking-tight', {
  variants: {
    size: {
      default: 'text-2xl leading-8',
      sm: 'text-lg leading-7'
    }
  },
  defaultVariants: {
    size: 'default'
  }
})

function EmptyTitle({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof emptyTitleVariants>) {
  return (
    <div
      data-slot="empty-title"
      data-size={size}
      className={cn(emptyTitleVariants({ size, className }))}
      {...props}
    />
  )
}

const emptyDescriptionVariants = cva(
  'text-muted-foreground [&>a:hover]:text-primary font-serif font-[350] text-balance [&>a]:underline [&>a]:underline-offset-4',
  {
    variants: {
      size: {
        default: 'text-base leading-6',
        sm: '[font-size:14px] leading-4.75'
      }
    },
    defaultVariants: {
      size: 'default'
    }
  }
)

function EmptyDescription({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<'p'> & VariantProps<typeof emptyDescriptionVariants>) {
  return (
    <p
      data-slot="empty-description"
      data-size={size}
      className={cn(emptyDescriptionVariants({ size, className }))}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        'flex w-full max-w-lg min-w-0 flex-col items-center gap-2.5 text-base text-balance',
        className
      )}
      {...props}
    />
  )
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia }
