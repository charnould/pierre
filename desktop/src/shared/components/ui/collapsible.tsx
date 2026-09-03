import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible'
import { cn } from 'cn'

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({ className, ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(className)}
      {...props}
    />
  )
}

function CollapsibleContent({
  className,
  variant = 'plain',
  ...props
}: CollapsiblePrimitive.Panel.Props & { variant?: 'plain' | 'animated' }) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      data-variant={variant}
      className={cn(
        'outline-none data-[variant=animated]:data-open:animate-in data-[variant=animated]:data-closed:animate-out',
        className
      )}
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
