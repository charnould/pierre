import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { useMemo } from 'react'

import { Label } from './label'
import { Separator } from './separator'

function FieldSet({ className, ...props }: React.ComponentProps<'fieldset'>) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn('flex min-w-0 flex-col gap-4', className)}
      {...props}
    />
  )
}

function FieldLegend({
  className,
  variant = 'legend',
  ...props
}: React.ComponentProps<'legend'> & { variant?: 'legend' | 'label' }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        'mb-1 font-medium data-[variant=label]:text-sm data-[variant=label]:leading-5 data-[variant=legend]:text-base data-[variant=legend]:leading-6',
        className
      )}
      {...props}
    />
  )
}

const fieldGroupVariants = cva(
  'group/field-group @container/field-group flex w-full flex-col gap-4',
  {
    variants: {
      variant: {
        default: '',
        detail:
          'animate-in fade-in-0 slide-in-from-top-1 border-input bg-muted [&>[data-slot=field]:not(:first-child)]:border-border/60 mt-2 mb-2 gap-0 rounded-md border p-4 duration-150 [&>[data-slot=field]]:py-2 [&>[data-slot=field]:first-child]:pt-0 [&>[data-slot=field]:last-child]:pb-0 [&>[data-slot=field]:not(:first-child)]:border-t',
        rows: '[&>[data-slot=field]:not(:first-child)]:border-border/60 gap-0 [&>[data-slot=field]]:py-2 [&>[data-slot=field]:first-child]:pt-0 [&>[data-slot=field]:last-child]:pb-0 [&>[data-slot=field]:not(:first-child)]:border-t'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

function FieldGroup({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof fieldGroupVariants>) {
  return (
    <div
      data-slot="field-group"
      data-variant={variant}
      className={cn(fieldGroupVariants({ variant }), className)}
      {...props}
    />
  )
}

const fieldVariants = cva('group/field data-[invalid=true]:text-destructive w-full', {
  variants: {
    orientation: {
      vertical: 'flex flex-col gap-2 *:w-full [&>.sr-only]:w-auto',
      horizontal:
        'md:grid-cols-form grid grid-cols-1 items-center gap-x-6 gap-y-2 has-[>[data-slot=checkbox]]:flex has-[>[data-slot=checkbox]]:flex-row has-[>[data-slot=checkbox]]:items-start has-[>[data-slot=checkbox]]:gap-2 has-[>[data-slot=checkbox]]:*:data-[slot=field-label]:min-w-0 has-[>[data-slot=checkbox]]:*:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
      wide: 'md:grid-cols-form-wide grid grid-cols-1 items-center gap-x-6 gap-y-2',
      responsive:
        'flex flex-col gap-2 *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px'
    }
  },
  defaultVariants: {
    orientation: 'vertical'
  }
})

function Field({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-content"
      className={cn('group/field-content flex min-w-0 flex-1 flex-col gap-1', className)}
      {...props}
    />
  )
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        'group/field-label peer/field-label flex w-fit gap-2 group-data-[disabled=true]/field:opacity-50',
        className
      )}
      {...props}
    />
  )
}

function FieldTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        'flex w-fit items-center gap-2 text-sm leading-5 font-semibold group-data-[disabled=true]/field:opacity-50',
        className
      )}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        'text-muted-foreground text-left font-serif [font-size:14px] leading-4.75 font-[350] text-balance',
        '[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4',
        className
      )}
      {...props}
    />
  )
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        'relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2',
        className
      )}
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {children && (
        <span
          className="bg-background text-muted-foreground relative mx-auto block w-fit px-2"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  )
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<'div'> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const content = useMemo(() => {
    if (children) {
      return children
    }

    if (!errors?.length) {
      return null
    }

    const uniqueErrors = [...new Map(errors.map((error) => [error?.message, error])).values()]

    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {uniqueErrors.map((error, index) => error?.message && <li key={index}>{error.message}</li>)}
      </ul>
    )
  }, [children, errors])

  if (!content) {
    return null
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn('text-destructive text-xs leading-4 font-normal', className)}
      {...props}
    >
      {content}
    </div>
  )
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle
}
