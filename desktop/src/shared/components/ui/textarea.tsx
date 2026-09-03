import { cn } from 'cn'
import * as React from 'react'

function Textarea({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'textarea'> & { variant?: 'default' | 'code' }) {
  return (
    <textarea
      data-slot="textarea"
      data-variant={variant}
      className={cn(
        'flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm data-[variant=code]:font-mono data-[variant=code]:text-xs data-[variant=code]:leading-normal data-[variant=code]:text-foreground/90',
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
