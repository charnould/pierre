import type { ReactNode } from 'react'

import { ChoiceTile } from '@/shared/components/ChoiceTile'

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

/** Thin alias of ChoiceTile — keep call sites stable. */
export function SettingsFieldOptionTile({ label, caption, className, ...props }: Props) {
  return <ChoiceTile title={label} caption={caption} className={className} {...props} />
}
