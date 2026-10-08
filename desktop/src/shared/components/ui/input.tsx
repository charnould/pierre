import { Input as InputPrimitive } from '@base-ui/react/input'
import { cn } from 'cn'
import * as React from 'react'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'border-input bg-control read-only:data-[slot=input]:bg-muted file:text-foreground placeholder:text-muted-foreground hover:border-foreground/30 focus-visible:border-ring focus-visible:ring-ring/20 aria-invalid:border-destructive aria-invalid:ring-destructive/20 h-8 w-full min-w-0 rounded-md border px-2.5 py-1 text-sm leading-5 tabular-nums transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium read-only:cursor-default focus-visible:ring-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-2',
        type === 'file' && 'appearance-none file:appearance-none',
        className
      )}
      {...props}
    />
  )
}

export { Input }
