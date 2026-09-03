import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/shared/components/ui/button'

const TIMELINE_ACTION_BUTTON_CLASS =
  'w-full max-w-full justify-start gap-2 rounded-md border-border/60 px-3 text-start has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg]:text-muted-foreground'

interface CommonProps {
  icon: LucideIcon
  label: string
}

type Props = CommonProps &
  (
    | {
        onClick: () => void
        trigger?: never
        emphasis?: 'primary' | 'outline'
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
      className={TIMELINE_ACTION_BUTTON_CLASS}
      onClick={props.onClick}
    >
      <Icon data-icon="inline-start" className="size-4" aria-hidden />
      <span className="text-balance">{label}</span>
    </Button>
  )

  return <li className="w-full max-w-full">{control}</li>
}
