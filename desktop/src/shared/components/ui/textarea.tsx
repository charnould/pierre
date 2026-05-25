import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { deskControlVariants } from '@/shared/lib/desk-control'
import { FIELD_FOCUS_VISIBLE } from '@/shared/lib/field-focus'
import { cn } from '@/shared/lib/utils'

const textareaVariants = cva(
  'flex field-sizing-content min-h-16 w-full rounded-lg border bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm',
  {
    variants: {
      variant: {
        default: 'border-input',
        desk: deskControlVariants({ variant: 'desk' })
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

function Textarea({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'textarea'> & VariantProps<typeof textareaVariants>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(textareaVariants({ variant }), FIELD_FOCUS_VISIBLE, className)}
      {...props}
    />
  )
}

export { Textarea, textareaVariants }
