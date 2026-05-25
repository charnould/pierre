import { Input as InputPrimitive } from '@base-ui/react/input'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { deskControlVariants } from '@/shared/lib/desk-control'
import { FIELD_FOCUS_VISIBLE } from '@/shared/lib/field-focus'
import { cn } from '@/shared/lib/utils'

const inputVariants = cva(
  'h-8 w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm',
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

function Input({
  className,
  type,
  variant = 'default',
  ...props
}: React.ComponentProps<'input'> & VariantProps<typeof inputVariants>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant }), FIELD_FOCUS_VISIBLE, className)}
      {...props}
    />
  )
}

export { Input, inputVariants }
