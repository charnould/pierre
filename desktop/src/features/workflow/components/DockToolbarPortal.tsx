import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function DockToolbarPortal({
  slot,
  children
}: {
  slot: HTMLElement | null
  children: ReactNode
}) {
  if (!slot) return null
  return createPortal(children, slot)
}
