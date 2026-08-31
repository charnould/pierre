import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

export const TIMELINE_ACTION_BUTTON_CLASS =
  "h-8 w-full max-w-full items-center justify-start gap-2 rounded-md border-border/60 px-3 pl-3 text-start text-sm leading-5 font-medium hover:bg-muted [&_svg]:text-muted-foreground [&_svg:not([class*='size-'])]:size-4"

interface CommonProps {
  icon: LucideIcon
  label: string
}

type Props = CommonProps &
  (
    | {
        onClick: () => void
        trigger?: never
        emphasis?: 'primary' | 'outline' | 'ghost'
      }
    | {
        onClick?: never
        /** Remplace le bouton (ex. DrawerTrigger pour drawer imbriqué). */
        trigger: ReactNode
        emphasis?: never
      }
  )

export function TimelineActionRow(props: Props) {
  const { icon: Icon, label } = props
  const hasTrigger = 'trigger' in props
  const control = hasTrigger ? (
    props.trigger
  ) : (
    <Button
      type="button"
      variant={props.emphasis === 'primary' ? 'default' : (props.emphasis ?? 'outline')}
      size="default"
      className={cn(
        TIMELINE_ACTION_BUTTON_CLASS,
        props.emphasis === 'ghost' && 'text-muted-foreground hover:text-foreground'
      )}
      onClick={props.onClick}
    >
      <Icon data-icon="inline-start" className="text-muted-foreground size-4" aria-hidden />
      <span className="[text-wrap:balance]">{label}</span>
    </Button>
  )

  return <li className="w-full max-w-full">{control}</li>
}
