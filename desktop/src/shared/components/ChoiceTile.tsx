import type { MouseEventHandler, PointerEventHandler, ReactNode } from 'react'

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
  as?: 'label' | 'div' | 'button'
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
  onClick?: MouseEventHandler<HTMLElement>
  onPointerEnter?: PointerEventHandler<HTMLElement>
  'data-door'?: string
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
  className,
  onClick,
  onPointerEnter,
  'data-door': dataDoor
}: Props) {
  return (
    <Item
      variant={placeholder ? 'muted' : 'outline'}
      size="sm"
      data-selected={selected || undefined}
      data-disabled={disabled || undefined}
      data-door={dataDoor}
      aria-disabled={disabled || undefined}
      render={
        Tag === 'label' ? (
          <FieldLabel htmlFor={htmlFor} />
        ) : Tag === 'button' ? (
          <button type="button" />
        ) : (
          <div />
        )
      }
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      className={cn(
        'items-start',
        selected && 'bg-muted',
        disabled && 'pointer-events-none opacity-50',
        interactive && !disabled && 'cursor-pointer',
        className
      )}
    >
      {icon ? <ItemMedia variant="icon">{icon}</ItemMedia> : null}
      <ItemContent className="min-w-0">
        <ItemTitle className="max-w-full">{title}</ItemTitle>
        {caption ? <ItemDescription>{caption}</ItemDescription> : null}
      </ItemContent>
      {signal ? (
        <ItemActions className="[&_svg:not([class*='size-'])]:size-4">{signal}</ItemActions>
      ) : null}
    </Item>
  )
}
