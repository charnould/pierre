import type { ElementType, ReactNode } from 'react'

import {
  FIELD_OPTION_TILE_BODY_CLASS,
  FIELD_OPTION_TILE_CAPTION_CLASS,
  FIELD_OPTION_TILE_CLASS,
  FIELD_OPTION_TILE_DISABLED_CLASS,
  FIELD_OPTION_TILE_ICON_CLASS,
  FIELD_OPTION_TILE_INTERACTIVE_CLASS,
  FIELD_OPTION_TILE_LABEL_CLASS,
  FIELD_OPTION_TILE_PLACEHOLDER_CLASS,
  FIELD_OPTION_TILE_ROW_CLASS,
  FIELD_OPTION_TILE_SELECTED_CLASS,
  FIELD_OPTION_TILE_SIGNAL_CLASS
} from '@/shared/lib/field-option-classes'
import { cn } from '@/shared/lib/utils'

interface Props {
  as?: 'label' | 'div'
  htmlFor?: string
  icon: ReactNode
  label: ReactNode
  caption: ReactNode
  signal: ReactNode
  selected?: boolean
  interactive?: boolean
  placeholder?: boolean
  disabled?: boolean
  className?: string
}

export function SettingsFieldOptionTile({
  as: Tag = 'div',
  htmlFor,
  icon,
  label,
  caption,
  signal,
  selected = false,
  interactive = false,
  placeholder = false,
  disabled = false,
  className
}: Props) {
  const Component = Tag as ElementType

  return (
    <Component
      htmlFor={htmlFor}
      className={cn(
        FIELD_OPTION_TILE_CLASS,
        interactive && FIELD_OPTION_TILE_INTERACTIVE_CLASS,
        selected && FIELD_OPTION_TILE_SELECTED_CLASS,
        placeholder && FIELD_OPTION_TILE_PLACEHOLDER_CLASS,
        disabled && FIELD_OPTION_TILE_DISABLED_CLASS,
        className
      )}
    >
      <span className={FIELD_OPTION_TILE_ROW_CLASS}>
        <span className={FIELD_OPTION_TILE_ICON_CLASS}>{icon}</span>
        <span className={FIELD_OPTION_TILE_BODY_CLASS}>
          <span className={cn(FIELD_OPTION_TILE_LABEL_CLASS, 'truncate')}>{label}</span>
          <span className={FIELD_OPTION_TILE_CAPTION_CLASS}>{caption}</span>
        </span>
        <span className={FIELD_OPTION_TILE_SIGNAL_CLASS}>{signal}</span>
      </span>
    </Component>
  )
}
