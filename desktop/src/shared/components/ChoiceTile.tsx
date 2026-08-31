import type { ReactNode } from 'react'

import { FieldLabel } from '@/shared/components/ui/field'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle
} from '@/shared/components/ui/item'
import { cn } from '@/shared/lib/utils'

interface Props {
  as?: 'label' | 'div'
  htmlFor?: string
  icon?: ReactNode
  title: ReactNode
  caption?: ReactNode
  signal?: ReactNode
  selected?: boolean
  interactive?: boolean
  placeholder?: boolean
  disabled?: boolean
  className?: string
}

export function ChoiceTile({
  as: Tag = 'div',
  htmlFor,
  icon,
  title,
  caption,
  signal,
  selected = false,
  interactive = false,
  placeholder = false,
  disabled = false,
  className
}: Props) {
  return (
    <Item
      variant={placeholder ? 'muted' : 'outline'}
      size="sm"
      render={Tag === 'label' ? <FieldLabel htmlFor={htmlFor} /> : <div />}
      className={cn(
        'items-start',
        selected && 'bg-muted',
        interactive && !disabled && 'cursor-pointer',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
    >
      {icon ? <ItemMedia variant="icon">{icon}</ItemMedia> : null}
      <ItemContent className="min-w-0">
        <ItemTitle className="max-w-full truncate">{title}</ItemTitle>
        {caption ? <ItemDescription>{caption}</ItemDescription> : null}
      </ItemContent>
      {signal ? (
        <ItemActions className="[&_svg:not([class*='size-'])]:size-4">{signal}</ItemActions>
      ) : null}
    </Item>
  )
}
